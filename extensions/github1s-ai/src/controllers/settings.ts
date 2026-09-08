import * as vscode from 'vscode';

import { parseMcpConfig } from '@/common/mcp-config';
import type { ViewEvent, ViewMessage } from '@/common/protocol';
import type { Stores } from '@/stores';
import { DEFAULT_STORE_VERSION } from '@/stores/common';

import { Controller } from './common';
import type { ConversationRunner } from './runner';

type HistoryExportMessage = Extract<ViewMessage, { type: 'settings.historyExport' }>;

export class SettingsController extends Controller {
	constructor(
		stores: Stores,
		private readonly runner: Pick<ConversationRunner, 'cancelAll'>,
	) {
		super(stores);
	}

	@Controller.handler('settings.clearFeedback')
	async handleClearFeedback(_event: ViewEvent<'settings.clearFeedback'>): Promise<void> {
		await this.clearFeedback();
	}

	@Controller.handler('settings.exportHistory')
	async handleExportHistory(_event: ViewEvent<'settings.exportHistory'>): Promise<HistoryExportMessage | undefined> {
		try {
			const confirmed = await vscode.window.showWarningMessage(
				'Export all conversation history?',
				{
					modal: true,
					detail: 'The JSON export may include code and file contents attached to conversations.',
				},
				'Export',
			);
			if (confirmed !== 'Export') return;

			const summaries = await this.stores.conversations.list();
			const storedConversations = await Promise.all(summaries.map(({ id }) => this.stores.conversations.get(id)));
			const conversations = storedConversations.filter((conversation) => conversation !== undefined);
			if (conversations.length !== summaries.length) {
				throw new Error('Some conversations could not be loaded.');
			}

			const date = new Date().toISOString().slice(0, 10);
			const content = JSON.stringify(
				{
					version: DEFAULT_STORE_VERSION,
					exportedAt: new Date().toISOString(),
					conversations,
				},
				null,
				2,
			);
			await this.setFeedback('success', 'Conversation history download started.');
			return {
				type: 'settings.historyExport',
				filename: `github1s-ai-conversation-history-${date}.json`,
				content: `${content}\n`,
			};
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.setFeedback('error', `Unable to export conversation history. ${detail}`);
		}
	}

	@Controller.handler('settings.clearAllData')
	async handleClearAllData(_event: ViewEvent<'settings.clearAllData'>): Promise<void> {
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
