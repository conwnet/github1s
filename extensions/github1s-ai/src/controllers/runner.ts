import type { LanguageModelUsage } from 'ai';
import { addLanguageModelUsage, createNullLanguageModelUsage } from 'ai/internal';

import {
	createAssistantMessage,
	createUserMessage,
	withMessageStatus,
	type Conversation,
	type ConversationMessage,
} from '@/common/conversation';
import { resolvePrompts } from '@/common/prompts-config';
import type { ChatQuickAction } from '@/common/quick-actions';
import { resolveContextAttachments } from '@/contexts';
import { buildModelMessages } from '@/llm/helpers';
import { connectMcpTools } from '@/llm/mcp';
import { streamLLMAgent } from '@/llm/transport';
import type { Stores } from '@/stores';

type ActiveRequest = {
	controller: AbortController;
	turnId: string;
};

export class ConversationRunner {
	private readonly requests = new Map<string, ActiveRequest>();
	private preparation: symbol | undefined;

	constructor(
		private readonly stores: Stores,
		private readonly publishState: () => Promise<void>,
	) {}

	async send(input: { text: string } | { action: ChatQuickAction }): Promise<void> {
		if (('text' in input && !input.text.trim()) || this.preparation) return;

		const [promptsConfig, config] = await Promise.all([
			this.stores.promptsConfig.get(),
			this.stores.modelConfigs.getSelected(),
		]);
		const prompts = resolvePrompts(promptsConfig);
		const text = 'text' in input ? input.text : prompts.quickActions[input.action];

		if (!config) {
			await this.stores.runtime.setIn('chat.notice', {
				severity: 'error',
				message: 'Select a model before sending a message.',
			});
			return;
		}
		const runtime = await this.stores.runtime.get();
		if (this.preparation) return;
		const descriptors = (runtime.chat.pendingAttachments ?? []).map((descriptor) => ({ ...descriptor }));
		const preparation = Symbol('conversation-preparation');
		this.preparation = preparation;
		await this.stores.runtime.setIn('chat', { ...runtime.chat, preparing: true, notice: undefined });

		let attachments;
		try {
			await this.publishState();
			attachments = await resolveContextAttachments(descriptors);
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.finishPreparation(preparation, `Unable to read the selected context attachment. ${detail}`);
			return;
		}
		if (this.preparation !== preparation) return;

		const previous = runtime.chat.conversation;
		const startedAt = Date.now();
		const conversationId = previous?.id ?? globalThis.crypto.randomUUID();
		if (this.requests.has(conversationId)) {
			await this.finishPreparation(preparation);
			return;
		}

		const turnId = globalThis.crypto.randomUUID();
		const userMessage = createUserMessage(turnId, text, attachments);
		let providerMessages;
		try {
			providerMessages = await buildModelMessages(previous?.messages ?? [], [userMessage]);
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.finishPreparation(preparation, `Unable to prepare the conversation. ${detail}`);
			return;
		}
		if (this.preparation !== preparation) return;

		const assistantMessage = createAssistantMessage(globalThis.crypto.randomUUID(), turnId);
		const conversation: Conversation = previous
			? {
					...previous,
					messages: [...previous.messages, userMessage, assistantMessage],
					updatedAt: startedAt,
				}
			: {
					id: conversationId,
					title: createConversationTitle(text, descriptors),
					messages: [userMessage, assistantMessage],
					createdAt: startedAt,
					updatedAt: startedAt,
				};
		try {
			if (previous) {
				await this.stores.conversations.update(conversationId, {
					messages: conversation.messages,
					updatedAt: conversation.updatedAt,
				});
			} else {
				await this.stores.conversations.append(conversation);
			}
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.finishPreparation(preparation, `Unable to save the conversation. ${detail}`);
			return;
		}
		if (this.preparation !== preparation) {
			await this.finishTurn(conversationId, turnId, 'aborted');
			return;
		}

		this.preparation = undefined;
		const abortController = new AbortController();
		const request: ActiveRequest = {
			controller: abortController,
			turnId,
		};
		this.requests.set(conversationId, request);
		let mcp: Awaited<ReturnType<typeof connectMcpTools>> | undefined;
		try {
			const currentRuntime = await this.stores.runtime.get();
			if (currentRuntime.chat.conversation?.id === previous?.id) {
				await this.stores.runtime.setIn('chat', {
					...currentRuntime.chat,
					conversation,
					pendingAttachments: [],
					preparing: false,
				});
				await this.stores.conversations.select(conversationId);
				await this.publishState();
			}
			mcp = await connectMcpTools(await this.stores.mcpConfig.get(), abortController.signal);
			abortController.signal.throwIfAborted();
			const agentStream = streamLLMAgent({ ...config }, providerMessages, abortController.signal, {
				instructions: prompts.instructions,
				responseMessage: assistantMessage,
				tools: mcp.tools,
			});
			for await (const message of agentStream.stream) {
				if (abortController.signal.aborted || this.requests.get(conversationId) !== request) break;
				await this.persistAssistantMessage(conversationId, request, withMessageStatus(message, 'streaming'));
			}
			if (!abortController.signal.aborted && this.requests.get(conversationId) === request) {
				const usage = await agentStream.usage;
				if (!abortController.signal.aborted && this.requests.get(conversationId) === request) {
					await this.completeTurn(conversationId, turnId, usage);
				}
			}
		} catch (error) {
			if (this.requests.get(conversationId) !== request) return;
			if (abortController.signal.aborted) {
				await this.finishTurn(conversationId, turnId, 'aborted');
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error.';
				await this.finishTurn(conversationId, turnId, 'failed', message);
			}
		} finally {
			if (this.requests.get(conversationId) === request) this.requests.delete(conversationId);
			await mcp?.close();
		}
	}

	async cancelCurrent(): Promise<void> {
		if (this.preparation) {
			await this.cancelPreparation();
			return;
		}
		const conversationId = (await this.stores.runtime.get()).chat.conversation?.id;
		if (conversationId) await this.cancelConversation(conversationId);
	}

	async cancelConversation(conversationId: string): Promise<void> {
		const request = this.requests.get(conversationId);
		if (!request) return;
		this.requests.delete(conversationId);
		request.controller.abort();
		await this.finishTurn(conversationId, request.turnId, 'aborted');
	}

	isRequestActive(conversationId: string | undefined): boolean {
		return conversationId !== undefined && this.requests.has(conversationId);
	}

	async cancelPreparation(): Promise<void> {
		if (this.preparation) await this.finishPreparation(this.preparation);
	}

	async cancelAll(): Promise<void> {
		await this.cancelPreparation();
		await Promise.allSettled(
			[...this.requests.keys()].map((conversationId) => this.cancelConversation(conversationId)),
		);
	}

	private async persistAssistantMessage(
		conversationId: string,
		request: ActiveRequest,
		message: ConversationMessage,
	): Promise<void> {
		if (this.requests.get(conversationId) !== request) return;
		const conversation = await this.stores.conversations.get(conversationId);
		if (!conversation || this.requests.get(conversationId) !== request) return;
		const messages = conversation.messages.map((candidate) => (candidate.id === message.id ? message : candidate));
		await this.stores.conversations.update(conversationId, { messages });
		const updated = { ...conversation, messages };
		await this.setCurrentConversation(updated);
		await this.publishState();
	}

	private async completeTurn(conversationId: string, turnId: string, usage: LanguageModelUsage): Promise<void> {
		await this.setTurnStatus(conversationId, turnId, 'completed', undefined, usage);
	}

	private async finishTurn(
		conversationId: string,
		turnId: string,
		status: 'aborted' | 'failed',
		error?: string,
	): Promise<void> {
		await this.setTurnStatus(conversationId, turnId, status, error);
	}

	private async setTurnStatus(
		conversationId: string,
		turnId: string,
		status: 'completed' | 'aborted' | 'failed',
		error?: string,
		usage?: LanguageModelUsage,
	): Promise<void> {
		const conversation = await this.stores.conversations.get(conversationId);
		if (!conversation) return;
		const messages = conversation.messages.map((message) =>
			message.role === 'assistant' && message.metadata.turnId === turnId
				? withMessageStatus(message, status, error)
				: message,
		);
		const updatedAt = Date.now();
		const nextUsage = usage === undefined ? undefined : addUsage(conversation.usage, usage);
		const summary = {
			updatedAt,
			...(nextUsage === undefined ? {} : { usage: nextUsage }),
		};
		await this.stores.conversations.update(conversationId, { messages, ...summary });
		await this.setCurrentConversation({ ...conversation, messages, ...summary });
		await this.publishState();
	}

	private async setCurrentConversation(conversation: Conversation): Promise<void> {
		const runtime = await this.stores.runtime.get();
		if (runtime.chat.conversation?.id !== conversation.id) return;
		await this.stores.runtime.setIn('chat.conversation', conversation);
	}

	private async finishPreparation(preparation: symbol, message?: string): Promise<void> {
		if (this.preparation !== preparation) return;
		this.preparation = undefined;
		const runtime = await this.stores.runtime.get();
		await this.stores.runtime.setIn('chat', {
			...runtime.chat,
			preparing: false,
			...(message ? { notice: { severity: 'error', message } } : {}),
		});
	}
}

const addUsage = (
	current: LanguageModelUsage | undefined,
	next: LanguageModelUsage,
): LanguageModelUsage | undefined => {
	if (next.inputTokens === undefined && next.outputTokens === undefined && next.totalTokens === undefined)
		return current;
	return addLanguageModelUsage(current ?? createNullLanguageModelUsage(), next);
};

const createConversationTitle = (prompt: string, attachments: readonly { label: string }[]): string => {
	const text = prompt.replace(/\s+/g, ' ').trim();
	const primary = attachments[0]?.label;
	const additional = attachments.length > 1 ? ` +${attachments.length - 1}` : '';
	const title = primary ? `${primary}${additional} — ${text}` : text;
	return title.length > 160 ? `${title.slice(0, 159)}…` : title;
};
