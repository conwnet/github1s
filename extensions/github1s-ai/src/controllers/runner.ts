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
import type { ChatPhase } from '@/common/protocol';
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
	private preparation: AbortController | undefined;

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
			const index = messages.findIndex((message) => message.id === messageId && message.role === 'assistant');
			const assistant = messages[index];
			const user = messages[index - 1];
			if (
				!assistant ||
				assistant.metadata.status === 'streaming' ||
				user?.role !== 'user' ||
				user.metadata.turnId !== assistant.metadata.turnId
			)
				return;
			return {
				history: messages.slice(0, index - 1),
				createMessage: async () => user,
				clearPendingAttachments: false,
			};
		});
	}

	async fork(messageId: string): Promise<void> {
		return this.withPreparation('Unable to fork the conversation.', async (chat, { signal }) => {
			const previous = chat.conversation;
			if (!previous || chat.editing) return;
			const index = previous.messages.findIndex((message) => message.id === messageId && message.role === 'assistant');
			if (index < 0 || previous.messages[index].metadata.status === 'streaming') return;
			const now = Date.now();
			const conversation: Conversation = {
				id: globalThis.crypto.randomUUID(),
				title: `Fork: ${previous.title}`,
				createdAt: now,
				updatedAt: now,
				messages: structuredClone(previous.messages.slice(0, index + 1)),
			};
			await this.stores.conversations.append(conversation);
			signal.throwIfAborted();
			await this.stores.conversations.select(conversation.id);
			const runtime = await this.stores.runtime.get();
			if (signal.aborted || runtime.page !== 'chat' || runtime.chat.conversation?.id !== previous.id) {
				await this.stores.conversations.select(runtime.chat.conversation?.id, conversation.id);
				return;
			}
			await this.stores.runtime.setIn('chat', {
				...runtime.chat,
				conversation,
				pendingAttachments: [],
				notice: { severity: 'success', message: "You're now in a forked conversation." },
			});
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
		return this.withPreparation('Unable to prepare the conversation.', async (chat, controller) => {
			const { signal } = controller;
			const previous = chat.conversation;
			const prepared = prepare(chat);
			if (!prepared) return;
			const [promptsConfig, config] = await Promise.all([
				this.stores.promptsConfig.get(),
				this.stores.modelConfigs.getSelected(),
			]);
			signal.throwIfAborted();
			if (!config) {
				await this.stores.runtime.setIn('chat.notice', {
					severity: 'error',
					message: 'Select a model before sending a message.',
				});
				return;
			}
			const prompts = resolvePrompts(promptsConfig);
			const conversationId = previous?.id ?? globalThis.crypto.randomUUID();
			const userMessage = await prepared.createMessage();
			signal.throwIfAborted();
			const startedAt = Date.now();
			const providerMessages = await buildModelMessages(prepared.history, [userMessage]);
			signal.throwIfAborted();
			const assistantMessage = createAssistantMessage(globalThis.crypto.randomUUID(), {
				turnId: userMessage.metadata.turnId,
				modelId: config.modelId,
				createdAt: startedAt,
			});
			const conversation: Conversation = previous
				? {
						...previous,
						messages: [...prepared.history, userMessage, assistantMessage],
						updatedAt: startedAt,
					}
				: {
						id: conversationId,
						title: createConversationTitle(userMessage),
						messages: [userMessage, assistantMessage],
						createdAt: startedAt,
						updatedAt: startedAt,
					};
			if (previous) {
				await this.stores.conversations.update(conversationId, {
					messages: conversation.messages,
					updatedAt: conversation.updatedAt,
				});
			} else {
				await this.stores.conversations.append(conversation);
			}
			if (signal.aborted) {
				await this.setMessageStatus(conversationId, assistantMessage.id, 'aborted');
				return;
			}
			const request: ActiveRequest = { controller, messageId: assistantMessage.id };
			this.requests.set(conversationId, request);
			this.preparation = undefined;
			let mcp: Awaited<ReturnType<typeof connectMcpTools>> | undefined;
			try {
				const currentRuntime = await this.stores.runtime.get();
				signal.throwIfAborted();
				if (currentRuntime.chat.conversation?.id === previous?.id) {
					await this.stores.runtime.setIn('chat', {
						...currentRuntime.chat,
						conversation,
						pendingAttachments: prepared.clearPendingAttachments ? [] : currentRuntime.chat.pendingAttachments,
						editing: undefined,
					});
					await this.stores.conversations.select(conversationId);
					await this.publishState();
				}
				mcp = await connectMcpTools(await this.stores.mcpConfig.get(), signal);
				signal.throwIfAborted();
				const agentStream = streamLLMAgent({ ...config }, providerMessages, signal, {
					instructions: prompts.instructions,
					responseMessage: assistantMessage,
					tools: mcp.tools,
				});
				for await (const message of agentStream.stream) {
					if (signal.aborted) break;
					await this.persistAssistantMessage(conversationId, request, withMessageStatus(message, 'streaming'));
				}
				if (!signal.aborted) {
					const usage = await agentStream.usage;
					if (!signal.aborted) {
						await this.setMessageStatus(conversationId, request.messageId, 'completed', undefined, usage);
					}
				}
			} catch (error) {
				if (!signal.aborted) {
					const message = error instanceof Error ? error.message : 'Unknown error.';
					await this.setMessageStatus(conversationId, request.messageId, 'failed', message);
				}
			} finally {
				if (this.requests.get(conversationId) === request) this.requests.delete(conversationId);
				await Promise.all([this.publishState(), mcp?.close()]);
			}
		});
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

	getPhase(conversationId: string | undefined): ChatPhase {
		if (this.preparation) return 'preparing';
		return this.isRequestActive(conversationId) ? 'generating' : 'idle';
	}

	async cancelPreparation(): Promise<void> {
		if (!this.preparation) return;
		this.preparation.abort();
		this.preparation = undefined;
		await this.publishState();
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
		if (request.controller.signal.aborted) return;
		const conversation = await this.stores.conversations.get(conversationId);
		if (!conversation || request.controller.signal.aborted) return;
		const messages = conversation.messages.map((candidate) => (candidate.id === message.id ? message : candidate));
		await this.stores.conversations.update(conversationId, { messages });
		const updated = { ...conversation, messages };
		await this.setCurrentConversation(updated, request.controller.signal);
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

	private async setCurrentConversation(conversation: Conversation, signal?: AbortSignal): Promise<void> {
		const runtime = await this.stores.runtime.get();
		if (runtime.chat.conversation?.id !== conversation.id || signal?.aborted) return;
		await this.stores.runtime.setIn('chat.conversation', { ...conversation, title: runtime.chat.conversation.title });
	}

	private async withPreparation(
		failureMessage: string,
		operation: (chat: RuntimeState['chat'], controller: AbortController) => Promise<void>,
	): Promise<void> {
		const { chat } = await this.stores.runtime.get();
		if (this.getPhase(chat.conversation?.id) !== 'idle') return;
		const controller = new AbortController();
		this.preparation = controller;
		try {
			await this.stores.runtime.setIn('chat.notice', undefined);
			await this.publishState();
			controller.signal.throwIfAborted();
			await operation(chat, controller);
		} catch (error) {
			if (!controller.signal.aborted) {
				const detail = error instanceof Error ? error.message : 'Unknown error.';
				await this.stores.runtime.setIn('chat.notice', { severity: 'error', message: `${failureMessage} ${detail}` });
			}
		} finally {
			if (this.preparation === controller) this.preparation = undefined;
			await this.publishState();
		}
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
