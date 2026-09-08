import type { LanguageModelUsage } from 'ai';
import { isPlainObject } from 'lodash-es';
import * as vscode from 'vscode';

import {
	validateConversationMessages,
	type Conversation,
	type ConversationMessage,
	type ConversationSummary,
} from '@/common/conversation';
import { createAsyncQueue } from '@/helpers/async-queue';

import { FilePersist } from './common';

const DETAIL_WRITE_DELAY = 100;
const DETAIL_WRITE_MAX_WAIT = 1000;

interface ConversationDetail {
	id: string;
	messages: ConversationMessage[];
}

interface ConversationIndex {
	selectedId?: string;
	summaries: ConversationSummary[];
}

export class ConversationsStore {
	private readonly enqueue = createAsyncQueue();
	private readonly rootDirectoryUri: vscode.Uri;
	private readonly dataDirectoryUri: vscode.Uri;

	private readonly indexPersist: FilePersist<ConversationIndex>;
	private indexCache: ConversationIndex | undefined;

	private readonly detailsPersistMap = new Map<string, FilePersist<ConversationDetail>>();
	private detailsCacheMap = new Map<string, ConversationDetail>();
	private detailsTimerMap = new Map<string, { timer: ReturnType<typeof setTimeout>; deadline: number }>();
	private readonly detailsWrites = new Set<Promise<void>>();

	constructor(context: vscode.ExtensionContext, workspaceKey: string) {
		this.rootDirectoryUri = vscode.Uri.joinPath(context.globalStorageUri, 'conversations');
		this.dataDirectoryUri = vscode.Uri.joinPath(this.rootDirectoryUri, workspaceKey);
		this.indexPersist = new FilePersist<ConversationIndex>({
			fileUri: vscode.Uri.joinPath(this.dataDirectoryUri, 'index.json'),
		});
	}

	async list(): Promise<ConversationSummary[]> {
		return (await this.readIndex()).summaries;
	}

	async getSelected(): Promise<Conversation | undefined> {
		const { selectedId } = await this.readIndex();
		return selectedId === undefined ? undefined : this.get(selectedId);
	}

	async select(id: string | undefined): Promise<void> {
		return this.enqueue(async () => {
			const index = await this.readIndex();
			if (id !== undefined && !index.summaries.some((conversation) => conversation.id === id)) {
				throw new Error(`Conversation with id ${id} not found.`);
			}
			if (index.selectedId !== id) await this.writeIndex({ ...index, selectedId: id });
		});
	}

	async get(id: string): Promise<Conversation | undefined> {
		const conversations = await this.list();
		const conversation = conversations.find((c) => c.id === id);
		if (!conversation) {
			return undefined;
		}
		if (this.detailsCacheMap.has(id)) {
			return { ...conversation, ...this.detailsCacheMap.get(id)! };
		}
		const storedDetails = await this.getDetailsPersist(id).read();
		if (!storedDetails || storedDetails.id !== id) {
			return undefined;
		}
		let messages: ConversationMessage[];
		try {
			messages = await validateConversationMessages(storedDetails.messages);
		} catch {
			return undefined;
		}
		const details = { ...storedDetails, messages };
		this.detailsCacheMap.set(id, details);
		return { ...conversation, ...details };
	}

	async append(conversation: Conversation): Promise<void> {
		return this.enqueue(async () => {
			if (!isConversationSummary(conversation)) {
				throw new Error('Invalid conversation object');
			}
			const messages = await validateMessages(conversation.messages, 'Invalid conversation object');
			const state = await this.readIndex();
			const conversations = state.summaries;
			if (conversations.find((c) => c.id === conversation.id)) {
				throw new Error(`Conversation with id ${conversation.id} already exists.`);
			}
			const summary: ConversationSummary = {
				id: conversation.id,
				title: conversation.title,
				createdAt: conversation.createdAt,
				updatedAt: conversation.updatedAt,
				...(conversation.usage === undefined ? {} : { usage: conversation.usage }),
			};
			const summaries = [...conversations, summary];
			await this.writeIndex({ ...state, summaries });
			const detail = { id: conversation.id, messages };
			await this.getDetailsPersist(conversation.id).write(detail);
			this.detailsCacheMap.set(conversation.id, detail);
		});
	}

	async update(id: string, data: Partial<Conversation>): Promise<void> {
		return this.enqueue(async () => {
			const state = await this.readIndex();
			let conversations = state.summaries;
			const index = conversations.findIndex((c) => c.id === id);
			if (index === -1) {
				throw new Error(`Conversation with id ${id} not found.`);
			}
			const { messages, ...restFields } = data;
			const updatedSummary =
				Object.keys(restFields).length > 0 ? { ...conversations[index], ...restFields } : undefined;
			if (updatedSummary && (updatedSummary.id !== id || !isConversationSummary(updatedSummary))) {
				throw new Error('Invalid conversation summary update');
			}
			if (messages !== undefined) {
				const validatedMessages = await validateMessages(messages, 'Invalid conversation messages');
				const pending = this.detailsTimerMap.get(id);
				if (pending) clearTimeout(pending.timer);
				const detail = { id, messages: validatedMessages };
				this.detailsCacheMap.set(id, detail);
				const deadline = pending?.deadline ?? Date.now() + DETAIL_WRITE_MAX_WAIT;
				this.detailsTimerMap.set(id, {
					deadline,
					timer: setTimeout(
						() => {
							this.detailsTimerMap.delete(id);
							const write = this.getDetailsPersist(id).write(detail);
							this.detailsWrites.add(write);
							void write.finally(() => this.detailsWrites.delete(write)).catch(() => undefined);
						},
						Math.max(0, Math.min(DETAIL_WRITE_DELAY, deadline - Date.now())),
					),
				});
			}
			if (updatedSummary) {
				conversations = conversations.map((conversation, itemIndex) =>
					itemIndex === index ? updatedSummary : conversation,
				);
				await this.writeIndex({ ...state, summaries: conversations });
			}
		});
	}

	async delete(id: string): Promise<void> {
		return this.enqueue(async () => {
			const state = await this.readIndex();
			const conversations = state.summaries;
			const index = conversations.findIndex((c) => c.id === id);
			if (index === -1) {
				throw new Error(`Conversation with id ${id} not found.`);
			}
			if (this.detailsTimerMap.has(id)) {
				clearTimeout(this.detailsTimerMap.get(id)!.timer);
				this.detailsTimerMap.delete(id);
			}
			await Promise.allSettled([...this.detailsWrites]);
			await this.getDetailsPersist(id).delete();
			this.detailsCacheMap.delete(id);
			const summaries = conversations.filter((_, itemIndex) => itemIndex !== index);
			await this.writeIndex({
				selectedId: state.selectedId === id ? undefined : state.selectedId,
				summaries,
			});
		});
	}

	// Deletes conversation history across all workspaces and resets this instance's caches and pending writes.
	async clearGlobal(): Promise<void> {
		return this.enqueue(async () => {
			for (const { timer } of this.detailsTimerMap.values()) clearTimeout(timer);
			this.detailsTimerMap.clear();
			await Promise.allSettled([...this.detailsWrites]);
			try {
				await vscode.workspace.fs.delete(this.rootDirectoryUri, { recursive: true });
			} catch (error) {
				if ((error as { code?: string })?.code !== 'FileNotFound') throw error;
			}
			this.indexCache = { summaries: [] };
			this.detailsPersistMap.clear();
			this.detailsCacheMap.clear();
			this.detailsWrites.clear();
		});
	}

	private async readIndex(): Promise<ConversationIndex> {
		if (this.indexCache === undefined) {
			const stored = await this.indexPersist.read();
			const summaries = sanitizeConversationSummaries(stored?.summaries);
			const selectedId = summaries.some(({ id }) => id === stored?.selectedId) ? stored?.selectedId : undefined;
			this.indexCache = { selectedId, summaries };
		}
		return this.indexCache;
	}

	private async writeIndex(index: ConversationIndex): Promise<void> {
		await this.indexPersist.write(index);
		this.indexCache = index;
	}

	private getDetailsPersist(id: string): FilePersist<ConversationDetail> {
		if (!this.detailsPersistMap.has(id)) {
			const detailsUri = vscode.Uri.joinPath(this.dataDirectoryUri, 'details', `${id}.json`);
			this.detailsPersistMap.set(
				id,
				new FilePersist<ConversationDetail>({
					fileUri: detailsUri,
				}),
			);
		}
		return this.detailsPersistMap.get(id)!;
	}
}

const isConversationSummary = (value: unknown): value is ConversationSummary => {
	if (!hasConversationSummaryFields(value)) return false;
	return value.usage === undefined || isLanguageModelUsage(value.usage);
};

const sanitizeConversationSummaries = (value: unknown): ConversationSummary[] => {
	if (!Array.isArray(value)) return [];
	const summaries: ConversationSummary[] = [];
	const ids = new Set<string>();
	for (const item of value) {
		if (!hasConversationSummaryFields(item) || ids.has(item.id)) continue;
		ids.add(item.id);
		summaries.push({
			id: item.id,
			title: item.title,
			createdAt: item.createdAt,
			updatedAt: item.updatedAt,
			...(isLanguageModelUsage(item.usage) ? { usage: item.usage } : {}),
		});
	}
	return summaries;
};

const hasConversationSummaryFields = (
	value: unknown,
): value is Record<string, unknown> & Pick<ConversationSummary, 'id' | 'title' | 'createdAt' | 'updatedAt'> => {
	if (!isPlainObject(value)) return false;
	const summary = value as Record<string, unknown>;
	return (
		typeof summary.id === 'string' &&
		summary.id.length > 0 &&
		typeof summary.title === 'string' &&
		typeof summary.createdAt === 'number' &&
		Number.isFinite(summary.createdAt) &&
		summary.createdAt >= 0 &&
		typeof summary.updatedAt === 'number' &&
		Number.isFinite(summary.updatedAt) &&
		summary.updatedAt >= summary.createdAt
	);
};

const isLanguageModelUsage = (value: unknown): value is LanguageModelUsage => {
	if (!isPlainObject(value)) return false;
	const usage = value as Record<string, unknown>;
	const inputTokenDetails = usage.inputTokenDetails;
	const outputTokenDetails = usage.outputTokenDetails;
	if (!isPlainObject(inputTokenDetails) || !isPlainObject(outputTokenDetails)) return false;
	const input = inputTokenDetails as Record<string, unknown>;
	const output = outputTokenDetails as Record<string, unknown>;
	return (
		isTokenCount(usage.inputTokens) &&
		isTokenCount(input.noCacheTokens) &&
		isTokenCount(input.cacheReadTokens) &&
		isTokenCount(input.cacheWriteTokens) &&
		isTokenCount(usage.outputTokens) &&
		isTokenCount(output.textTokens) &&
		isTokenCount(output.reasoningTokens) &&
		isTokenCount(usage.totalTokens)
	);
};

const isTokenCount = (value: unknown): value is number | undefined =>
	value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= 0);

const validateMessages = async (value: unknown, message: string): Promise<ConversationMessage[]> => {
	try {
		return await validateConversationMessages(value);
	} catch {
		throw new Error(message);
	}
};
