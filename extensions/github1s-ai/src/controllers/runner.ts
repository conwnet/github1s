import type { LanguageModelUsage } from 'ai';
import { addLanguageModelUsage, createNullLanguageModelUsage } from 'ai/internal';

import {
	createAssistantMessage,
	createUserMessage,
	getRetryableMessage,
	withMessageStatus,
	type Conversation,
	type ConversationMessage,
} from '@/common/conversation';
import { resolvePrompts } from '@/common/prompts-config';
import type { ChatQuickAction } from '@/common/quick-actions';
import { buildModelMessages } from '@/llm/helpers';
import { connectMcpTools } from '@/llm/mcp';
import { streamLLMAgent } from '@/llm/transport';
import type { Stores } from '@/stores';

import { resolveContextAttachments } from './context';

type ActiveRequest = {
	controller: AbortController;
	messageId: string;
};

export class ConversationRunner {
	private readonly requests = new Map<string, ActiveRequest>();
	private preparation: symbol | undefined;

	constructor(
		private readonly stores: Stores,
		private readonly publishState: () => Promise<void>,
	) {}

	async send(input: { text: string } | { action: ChatQuickAction } | { retryMessageId: string }): Promise<void> {
		if (('text' in input && !input.text.trim()) || this.preparation) return;

		const [promptsConfig, config] = await Promise.all([
			this.stores.promptsConfig.get(),
			this.stores.modelConfigs.getSelected(),
		]);
		const prompts = resolvePrompts(promptsConfig);
		const text = 'text' in input ? input.text : 'action' in input ? prompts.quickActions[input.action] : '';
		const retry = 'retryMessageId' in input;

		if (!config) {
			await this.stores.runtime.setIn('chat.notice', {
				severity: 'error',
				message: 'Select a model before sending a message.',
			});
			return;
		}
		const runtime = await this.stores.runtime.get();
		if (this.preparation) return;
		const previous = runtime.chat.conversation;
		if (retry && (!previous || getRetryableMessage(previous.messages)?.id !== input.retryMessageId)) return;
		const conversationId = previous?.id ?? globalThis.crypto.randomUUID();
		if (this.requests.has(conversationId)) return;
		const descriptors = (runtime.chat.pendingAttachments ?? []).map((descriptor) => ({ ...descriptor }));
		const preparation = Symbol('conversation-preparation');
		this.preparation = preparation;
		await this.stores.runtime.setIn('chat', { ...runtime.chat, preparing: true, notice: undefined });

		let userMessage: ConversationMessage;
		try {
			await this.publishState();
			if (retry) {
				userMessage = previous!.messages.at(-2)!;
			} else {
				const attachments = await resolveContextAttachments(descriptors);
				const recentFiles = runtime.chat.includeRecentFiles === false ? [] : runtime.chat.recentFiles;
				userMessage = createUserMessage(globalThis.crypto.randomUUID(), text, attachments, recentFiles);
			}
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.finishPreparation(preparation, `Unable to read the selected context attachment. ${detail}`);
			return;
		}
		if (this.preparation !== preparation) return;

		const startedAt = Date.now();
		const turnId = userMessage.metadata.turnId;
		const history = retry ? previous!.messages.slice(0, -2) : (previous?.messages ?? []);
		let providerMessages;
		try {
			providerMessages = await buildModelMessages(history, [userMessage]);
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
					messages: [...history, userMessage, assistantMessage],
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
			await this.setMessageStatus(conversationId, assistantMessage.id, 'aborted');
			return;
		}

		this.preparation = undefined;
		const abortController = new AbortController();
		const request: ActiveRequest = {
			controller: abortController,
			messageId: assistantMessage.id,
		};
		this.requests.set(conversationId, request);
		let mcp: Awaited<ReturnType<typeof connectMcpTools>> | undefined;
		try {
			const currentRuntime = await this.stores.runtime.get();
			if (currentRuntime.chat.conversation?.id === previous?.id) {
				await this.stores.runtime.setIn('chat', {
					...currentRuntime.chat,
					conversation,
					pendingAttachments: retry ? currentRuntime.chat.pendingAttachments : [],
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
					await this.setMessageStatus(conversationId, request.messageId, 'completed', undefined, usage);
				}
			}
		} catch (error) {
			if (this.requests.get(conversationId) !== request) return;
			if (abortController.signal.aborted) {
				await this.setMessageStatus(conversationId, request.messageId, 'aborted');
			} else {
				const message = error instanceof Error ? error.message : 'Unknown error.';
				await this.setMessageStatus(conversationId, request.messageId, 'failed', message);
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
		await this.setMessageStatus(conversationId, request.messageId, 'aborted');
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

	private async setMessageStatus(
		conversationId: string,
		messageId: string,
		status: 'completed' | 'aborted' | 'failed',
		error?: string,
		usage?: LanguageModelUsage,
	): Promise<void> {
		const conversation = await this.stores.conversations.get(conversationId);
		if (!conversation?.messages.some((message) => message.id === messageId)) return;
		const messages = conversation.messages.map((message) =>
			message.id === messageId ? withMessageStatus(message, status, error) : message,
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
