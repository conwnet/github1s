import { isPlainObject } from 'lodash-es';
import * as vscode from 'vscode';

import {
	isConversationSummary,
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

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly workspaceKey: string,
	) {
		this.rootDirectoryUri = vscode.Uri.joinPath(context.globalStorageUri, 'conversations');
		this.dataDirectoryUri = vscode.Uri.joinPath(this.rootDirectoryUri, workspaceKey);
		this.indexPersist = new FilePersist<ConversationIndex>({
			fileUri: vscode.Uri.joinPath(this.dataDirectoryUri, 'index.json'),
			check: isConversationIndex,
		});
	}

	forWorkspace(workspaceKey: string): ConversationsStore {
		return workspaceKey === this.workspaceKey ? this : new ConversationsStore(this.context, workspaceKey);
	}

	async listWorkspaces(): Promise<string[]> {
		const keys = new Set([this.workspaceKey]);
		try {
			for (const [key, type] of await vscode.workspace.fs.readDirectory(this.rootDirectoryUri)) {
				if (type === vscode.FileType.Directory) keys.add(key);
			}
		} catch (error) {
			if ((error as { code?: string })?.code !== 'FileNotFound') throw error;
		}
		return [...keys].sort();
	}

	async list(): Promise<ConversationSummary[]> {
		return (await this.readIndex()).summaries;
	}

	async getSelected(): Promise<Conversation | undefined> {
		const { selectedId } = await this.readIndex();
		return selectedId === undefined ? undefined : this.get(selectedId);
	}

	async select(id: string | undefined, expectedId?: string): Promise<void> {
		return this.enqueue(async () => {
			const index = await this.readIndex();
			if (expectedId !== undefined && index.selectedId !== expectedId) return;
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
			const detail = { id: conversation.id, messages };
			const persist = this.getDetailsPersist(conversation.id);
			await persist.write(detail);
			try {
				await this.writeIndex({ ...state, summaries });
			} catch (error) {
				await persist.delete().catch(() => undefined);
				throw error;
			}
			this.detailsCacheMap.set(conversation.id, detail);
		});
	}

	async replace(conversation: Conversation): Promise<void> {
		return this.enqueue(async () => {
			if (!isConversationSummary(conversation)) throw new Error('Invalid conversation object');
			const { messages, ...summary } = conversation;
			const detail = { id: summary.id, messages: await validateMessages(messages, 'Invalid conversation object') };
			const state = await this.readIndex();
			if (!state.summaries.some(({ id }) => id === summary.id)) {
				throw new Error(`Conversation with id ${summary.id} not found.`);
			}
			const pending = this.detailsTimerMap.get(summary.id);
			if (pending) {
				clearTimeout(pending.timer);
				this.detailsTimerMap.delete(summary.id);
			}
			await Promise.allSettled([...this.detailsWrites]);
			const persist = this.getDetailsPersist(summary.id);
			// Preserve pending local messages if writing the replacement fails.
			if (pending) await persist.write(this.detailsCacheMap.get(summary.id)!);
			await persist.write(detail);
			this.detailsCacheMap.set(summary.id, detail);
			await this.writeIndex({
				...state,
				summaries: state.summaries.map((item) => (item.id === summary.id ? summary : item)),
			});
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

	async delete(ids: string[]): Promise<void> {
		const requested = new Set(ids);
		if (requested.size === 0) return;
		return this.enqueue(async () => {
			const state = await this.readIndex();
			const existingIds = new Set(state.summaries.map(({ id }) => id));
			for (const id of requested) {
				if (!existingIds.has(id)) throw new Error(`Conversation with id ${id} not found.`);
			}
			for (const id of requested) {
				if (this.detailsTimerMap.has(id)) {
					clearTimeout(this.detailsTimerMap.get(id)!.timer);
					this.detailsTimerMap.delete(id);
				}
			}
			await Promise.allSettled([...this.detailsWrites]);
			const deleted = new Set<string>();
			try {
				for (const id of requested) {
					await this.getDetailsPersist(id).delete();
					this.detailsCacheMap.delete(id);
					deleted.add(id);
				}
			} finally {
				// Save completed deletions even if a later file cannot be removed.
				if (deleted.size > 0) {
					await this.writeIndex({
						selectedId: state.selectedId !== undefined && deleted.has(state.selectedId) ? undefined : state.selectedId,
						summaries: state.summaries.filter(({ id }) => !deleted.has(id)),
					});
				}
			}
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
			this.indexCache = (await this.indexPersist.read()) ?? { summaries: [] };
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

const isConversationIndex = (value: unknown): value is ConversationIndex => {
	if (!isPlainObject(value)) return false;
	const index = value as Record<string, unknown>;
	return (
		Array.isArray(index.summaries) &&
		index.summaries.every(isConversationSummary) &&
		(index.selectedId === undefined || typeof index.selectedId === 'string')
	);
};

const validateMessages = async (value: unknown, message: string): Promise<ConversationMessage[]> => {
	try {
		return await validateConversationMessages(value);
	} catch {
		throw new Error(message);
	}
};
