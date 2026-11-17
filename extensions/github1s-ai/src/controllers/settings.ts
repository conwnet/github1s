import * as vscode from 'vscode';

import {
	isConversationWorkspaceKey,
	markStreamingMessagesUnknown,
	parseConversationHistory,
	type Conversation,
	type ConversationHistory,
} from '@/common/conversation';
import { parseMcpConfig } from '@/common/mcp-config';
import type { ViewEvent, ViewMessage } from '@/common/protocol';
import { createAsyncQueue } from '@/helpers/async-queue';
import type { Stores } from '@/stores';

import { Controller } from './common';
import type { ConversationRunner } from './runner';

type HistoryExportMessage = Extract<ViewMessage, { type: 'settings.historyExport' }>;

export class SettingsController extends Controller {
	private readonly enqueue = createAsyncQueue();

	constructor(
		stores: Stores,
		private readonly runner: Pick<ConversationRunner, 'cancelAll' | 'isBusy'>,
	) {
		super(stores);
	}

	@Controller.handler('settings.clearFeedback')
	async handleClearFeedback(_event: ViewEvent<'settings.clearFeedback'>): Promise<void> {
		await this.clearFeedback();
	}

	@Controller.handler('settings.exportHistory')
	async handleExportHistory(_event: ViewEvent<'settings.exportHistory'>): Promise<HistoryExportMessage | undefined> {
		return this.enqueue(async () => {
			try {
				const confirmed = await vscode.window.showWarningMessage(
					'Export history?',
					{
						modal: true,
						detail: 'Includes all workspaces and may contain attached code and file contents.',
					},
					'Export',
				);
				if (confirmed !== 'Export') return;

				const workspaces: ConversationHistory['workspaces'] = [];
				for (const workspaceKey of await this.stores.conversations.listWorkspaces()) {
					if (!isConversationWorkspaceKey(workspaceKey)) throw new Error('Invalid workspace history directory.');
					const store = this.stores.conversations.forWorkspace(workspaceKey);
					const conversations = await Promise.all((await store.list()).map(({ id }) => store.get(id)));
					if (!conversations.every((conversation) => conversation !== undefined)) {
						throw new Error('Some conversations could not be loaded.');
					}
					if (conversations.length > 0) workspaces.push({ workspaceKey, conversations });
				}
				const history = { exportedAt: new Date().toISOString(), workspaces };
				const date = history.exportedAt.slice(0, 10);
				const content = JSON.stringify(history, null, 2);
				await this.setFeedback('success', 'History download started.');
				return {
					type: 'settings.historyExport',
					filename: `conversation-history-${date}.json`,
					content: `${content}\n`,
				};
			} catch (error) {
				const detail = error instanceof Error ? error.message : 'Unknown error.';
				await this.setFeedback('error', `Unable to export history. ${detail}`);
			}
		});
	}

	@Controller.handler('settings.importHistory')
	async handleImportHistory(event: ViewEvent<'settings.importHistory'>): Promise<void> {
		return this.enqueue(async () => {
			try {
				const history = await parseConversationHistory(event.content);
				if (this.runner.isBusy()) throw new Error('Stop all responses before importing history.');
				const currentId = (await this.stores.runtime.get()).chat.conversation?.id;
				let importedCurrent: Conversation | undefined;
				const deletions = new Map<string, string[]>();
				if (event.options.mode === 'replace') {
					for (const workspaceKey of await this.stores.conversations.listWorkspaces()) {
						const importedIds = new Set(
							history.workspaces
								.find((workspace) => workspace.workspaceKey === workspaceKey)
								?.conversations.map(({ id }) => id),
						);
						const local = await this.stores.conversations.forWorkspace(workspaceKey).list();
						deletions.set(
							workspaceKey,
							local.filter(({ id }) => !importedIds.has(id)).map(({ id }) => id),
						);
					}
				}
				for (const { workspaceKey, conversations } of history.workspaces) {
					const store = this.stores.conversations.forWorkspace(workspaceKey);
					const existingIds = new Set((await store.list()).map(({ id }) => id));
					for (const conversation of conversations) {
						if (existingIds.has(conversation.id)) {
							if (event.options.mode === 'merge' && event.options.conflicts === 'keep') continue;
							await store.replace(conversation);
							if (store === this.stores.conversations && conversation.id === currentId) importedCurrent = conversation;
						} else {
							await store.append(conversation);
						}
					}
				}
				for (const [workspaceKey, ids] of deletions) {
					const store = this.stores.conversations.forWorkspace(workspaceKey);
					await store.delete(ids);
					await store.select(undefined);
				}
				const runtime = await this.stores.runtime.get();
				let chat = runtime.chat;
				if (event.options.mode === 'replace') {
					chat = { ...chat, conversation: undefined, editing: undefined, pendingAttachments: [], notice: undefined };
				} else if (importedCurrent && chat.conversation?.id === importedCurrent.id) {
					chat = {
						...chat,
						conversation: markStreamingMessagesUnknown(importedCurrent),
						editing: undefined,
						pendingAttachments: [],
						notice: undefined,
					};
				}
				await this.stores.runtime.set({
					...runtime,
					chat,
					history: {},
					settings: { feedback: { severity: 'success', message: 'History imported.' } },
				});
			} catch (error) {
				const detail = error instanceof Error ? error.message : 'Unknown error.';
				await this.setFeedback('error', `Unable to import history. ${detail}`);
			}
		});
	}

	@Controller.handler('settings.clearAllData')
	async handleClearAllData(_event: ViewEvent<'settings.clearAllData'>): Promise<void> {
		return this.enqueue(async () => {
			try {
				const confirmed = await vscode.window.showWarningMessage(
					'Clear all GitHub1s AI data?',
					{
						modal: true,
						detail:
							'This deletes conversation history across all workspaces, model settings, MCP settings, and prompt settings.',
					},
					'Clear all data',
				);
				if (confirmed !== 'Clear all data') return;

				await this.runner.cancelAll();
				await Promise.all([
					this.stores.conversations.clearGlobal(),
					this.stores.modelConfigs.clear(),
					this.stores.mcpConfig.clear(),
					this.stores.promptsConfig.clear(),
				]);
				await this.stores.runtime.set({
					page: 'settings',
					chat: {},
					history: {},
					settings: { feedback: { severity: 'success', message: 'All data cleared.' } },
				});
			} catch (error) {
				const detail = error instanceof Error ? error.message : 'Unknown error.';
				await this.setFeedback('error', `Unable to clear all data. ${detail}`);
			}
		});
	}

	@Controller.handler('settings.selectModelConfig')
	async handleSelectModelConfig(event: ViewEvent<'settings.selectModelConfig'>): Promise<void> {
		if (!(await this.stores.modelConfigs.get(event.id))) return;
		await this.stores.modelConfigs.select(event.id);
	}

	@Controller.handler('settings.saveModelConfig')
	async handleSaveModelConfig(event: ViewEvent<'settings.saveModelConfig'>): Promise<void> {
		try {
			const { id, apiKey: enteredApiKey, ...input } = event.config;
			const existing = id ? await this.stores.modelConfigs.get(id) : undefined;
			if (id && !existing) {
				throw new Error('The model no longer exists.');
			}
			const apiKey = enteredApiKey.trim();
			const data = {
				...input,
				name: input.name.trim(),
				baseURL: input.baseURL.trim().replace(/\/+$/, ''),
				modelId: input.modelId.trim(),
			};
			if (existing) {
				await this.stores.modelConfigs.update(existing.id, { ...data, ...(apiKey ? { apiKey } : {}) });
			} else {
				if (!apiKey) throw new Error('API key is required.');
				await this.stores.modelConfigs.append({ ...data, id: globalThis.crypto.randomUUID(), apiKey });
			}
			await this.setFeedback('success', 'Model saved.');
		} catch (error) {
			await this.setFeedback('error', error instanceof Error ? error.message : 'Unable to save this model.');
		}
	}

	@Controller.handler('settings.savePromptsConfig')
	async handleSavePromptsConfig(event: ViewEvent<'settings.savePromptsConfig'>): Promise<void> {
		try {
			await this.stores.promptsConfig.set(event.config);
			await this.setFeedback('success', 'Prompts saved.');
		} catch (error) {
			await this.setFeedback('error', error instanceof Error ? error.message : 'Unable to save prompts.');
		}
	}

	@Controller.handler('settings.saveMcpConfig')
	async handleSaveMcpConfig(event: ViewEvent<'settings.saveMcpConfig'>): Promise<void> {
		try {
			await this.stores.mcpConfig.set(parseMcpConfig(JSON.parse(event.json)));
			await this.setFeedback('success', 'MCP settings saved. Changes apply to the next response.');
		} catch (error) {
			await this.setFeedback(
				'error',
				error instanceof SyntaxError
					? 'Invalid JSON. Check the MCP configuration.'
					: error instanceof Error
						? error.message
						: 'Unable to save MCP settings.',
			);
		}
	}

	@Controller.handler('settings.deleteModelConfig')
	async handleDeleteModelConfig(event: ViewEvent<'settings.deleteModelConfig'>): Promise<void> {
		if (!(await this.stores.modelConfigs.get(event.id))) {
			await this.setFeedback('error', 'The model no longer exists.');
			return;
		}
		await this.stores.modelConfigs.delete(event.id);
		await this.setFeedback('success', 'Model deleted.');
	}

	private async clearFeedback(): Promise<void> {
		await this.stores.runtime.setIn('settings.feedback', undefined);
	}

	private async setFeedback(severity: 'success' | 'error', message: string): Promise<void> {
		await this.stores.runtime.setIn('settings.feedback', { severity, message });
	}
}
