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
import type { RuntimeState } from '@/common/state';
import { buildModelMessages } from '@/llm/helpers';
import { connectMcpTools } from '@/llm/mcp';
import { streamLLMAgent } from '@/llm/transport';
import type { Stores } from '@/stores';

import { resolveContextAttachments } from './context';

type ActiveRequest = {
	controller: AbortController;
	messageId: string;
};

type MessagePreparation = {
	history: ConversationMessage[];
	createMessage: () => Promise<ConversationMessage>;
	clearPendingAttachments: boolean;
};

export class ConversationRunner {
	private readonly requests = new Map<string, ActiveRequest>();
	private preparation: symbol | undefined;

	constructor(
		private readonly stores: Stores,
		private readonly publishState: () => Promise<void>,
	) {}

	async send(text: string): Promise<void> {
		if (!text.trim()) return;
		return this.run((chat) => ({
			history: chat.conversation?.messages ?? [],
			clearPendingAttachments: true,
			createMessage: async () =>
				createUserMessage(
					globalThis.crypto.randomUUID(),
					text,
					await resolveContextAttachments(chat.pendingAttachments ?? []),
					chat.includeRecentFiles === false ? [] : chat.recentFiles,
				),
		}));
	}

	async retry(messageId: string): Promise<void> {
		return this.run((chat) => {
			const messages = chat.conversation?.messages ?? [];
			if (getRetryableMessage(messages)?.id !== messageId) return;
			return {
				history: messages.slice(0, -2),
				createMessage: async () => messages[messages.length - 2],
				clearPendingAttachments: false,
			};
		});
	}

	async edit(text: string): Promise<void> {
		if (!text.trim()) return;
		return this.run((chat) => {
			const editing = chat.editing;
			if (!editing) return;
			const messages = chat.conversation?.messages ?? [];
			const messageIndex = messages.findIndex((message) => message.id === editing.messageId && message.role === 'user');
			if (messageIndex < 0) return;
			const originalMessage = messages[messageIndex];
			const descriptors = editing.pendingAttachments.map((descriptor) => ({ ...descriptor }));
			return {
				history: messages.slice(0, messageIndex),
				clearPendingAttachments: false,
				createMessage: async () => {
					const originalAttachments = originalMessage.parts.flatMap((part) =>
						part.type === 'data-attachments' ? part.data : [],
					);
					const attachments = await Promise.all(
						descriptors.map(
							async (descriptor) =>
								originalAttachments.find((attachment) => attachment.id === descriptor.id) ??
								(await resolveContextAttachments([descriptor]))[0],
						),
					);
					const recentFiles =
						editing.includeRecentFiles === false
							? []
							: originalMessage.parts.flatMap((part) => (part.type === 'data-recentFiles' ? part.data : []));
					return createUserMessage(originalMessage.metadata.turnId, text, attachments, recentFiles);
				},
			};
		});
	}

	private async run(prepare: (chat: RuntimeState['chat']) => MessagePreparation | undefined): Promise<void> {
		if (this.preparation) return;

		const [promptsConfig, config] = await Promise.all([
			this.stores.promptsConfig.get(),
			this.stores.modelConfigs.getSelected(),
		]);
		const prompts = resolvePrompts(promptsConfig);

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
		const prepared = prepare(runtime.chat);
		if (!prepared) return;
		const conversationId = previous?.id ?? globalThis.crypto.randomUUID();
		if (this.requests.has(conversationId)) return;
		const preparation = Symbol('conversation-preparation');
		this.preparation = preparation;
		await this.stores.runtime.setIn('chat', { ...runtime.chat, preparing: true, notice: undefined });

		let userMessage: ConversationMessage;
		try {
			await this.publishState();
			userMessage = await prepared.createMessage();
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.finishPreparation(preparation, `Unable to read the selected context attachment. ${detail}`);
			return;
		}
		if (this.preparation !== preparation) return;

		const startedAt = Date.now();
		const turnId = userMessage.metadata.turnId;
		const history = prepared.history;
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
					title: createConversationTitle(userMessage),
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
					pendingAttachments: prepared.clearPendingAttachments ? [] : currentRuntime.chat.pendingAttachments,
					editing: undefined,
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

const createConversationTitle = (message: ConversationMessage): string => {
	const prompt = message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');
	const attachments = message.parts.flatMap((part) => (part.type === 'data-attachments' ? part.data : []));
	const text = prompt.replace(/\s+/g, ' ').trim();
	const primary = attachments[0]?.label;
	const additional = attachments.length > 1 ? ` +${attachments.length - 1}` : '';
	const title = primary ? `${primary}${additional} — ${text}` : text;
	return title.length > 160 ? `${title.slice(0, 159)}…` : title;
};
