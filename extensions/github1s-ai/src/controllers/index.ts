import * as vscode from 'vscode';

import type { ViewEvent, ViewMessage, ViewState } from '@/common/protocol';
import { currentFile, currentSelection, preserveContextAttachmentId } from '@/contexts';
import type { Stores } from '@/stores';

import { AppController } from './app';
import { ChatController } from './chat';
import { HistoryController } from './history';
import { ConversationRunner } from './runner';
import { SettingsController } from './settings';

export class Controllers {
	private readonly runner: ConversationRunner;
	private editorAttachmentRefresh = 0;
	private stateRevision = 0;

	private readonly listeners = new Map<
		ViewEvent['type'],
		(event: never) => ViewMessage | void | Promise<ViewMessage | void>
	>();
	private readonly stateChangedEmitter = new vscode.EventEmitter<ViewState>();
	private readonly disposables: vscode.Disposable[] = [];

	constructor(private readonly stores: Stores) {
		this.runner = new ConversationRunner(stores, () => this.syncState());
		const controllers = [
			new AppController(stores, this.runner),
			new ChatController(stores, this.runner),
			new HistoryController(stores, this.runner),
			new SettingsController(stores, this.runner),
		];
		for (const controller of controllers) {
			for (const [type, handler] of controller.eventHandlers()) {
				this.listeners.set(type, handler);
			}
		}
		this.disposables.push(...this.registerAttachmentsListeners());
		void this.refreshAttachmentsStatus().catch(() => undefined);
	}

	async emit(event: ViewEvent): Promise<ViewMessage | undefined> {
		const message = await this.listeners.get(event.type)?.(event as never);
		await this.syncState();
		return message || undefined;
	}

	onStateChange(handler: (state: ViewState) => void): vscode.Disposable {
		return this.stateChangedEmitter.event(handler);
	}

	dispose(): void {
		void this.runner.cancelAll();
		this.stateChangedEmitter.dispose();
		for (const disposable of this.disposables.splice(0)) {
			disposable.dispose();
		}
	}

	private async syncState(): Promise<void> {
		const revision = ++this.stateRevision;
		const state = await this.snapshot();
		if (revision === this.stateRevision) {
			this.stateChangedEmitter.fire(state);
		}
	}

	private async snapshot(): Promise<ViewState> {
		const [runtime, promptsConfig, configs, selectedModel, conversations] = await Promise.all([
			this.stores.runtime.get(),
			this.stores.promptsConfig.get(),
			this.stores.modelConfigs.list(),
			this.stores.modelConfigs.getSelected(),
			this.stores.conversations.list(),
		]);

		// Only the settings editor needs MCP credentials.
		const mcpConfig = runtime.page === 'settings' ? await this.stores.mcpConfig.get() : undefined;
		return {
			runtime,
			promptsConfig,
			modelConfigs: { configs, selectedId: selectedModel?.id },
			conversations,
			mcpConfig,
		};
	}

	async refreshAttachmentsStatus(): Promise<void> {
		const refresh = ++this.editorAttachmentRefresh;
		const [currentFileDescriptor, currentSelectionDescriptor] = await Promise.all([
			currentFile().catch(() => undefined),
			currentSelection().catch(() => undefined),
		]);
		if (refresh !== this.editorAttachmentRefresh) return;
		const runtime = await this.stores.runtime.get();
		await this.stores.runtime.setIn('chat', {
			...runtime.chat,
			currentFile: currentFileDescriptor
				? preserveContextAttachmentId(currentFileDescriptor, runtime.chat.currentFile)
				: undefined,
			currentSelection: currentSelectionDescriptor
				? preserveContextAttachmentId(currentSelectionDescriptor, runtime.chat.currentSelection)
				: undefined,
		});
		await this.syncState();
	}

	registerAttachmentsListeners(): vscode.Disposable[] {
		return [
			vscode.window.onDidChangeActiveTextEditor(() => this.refreshAttachmentsStatus()),
			vscode.window.onDidChangeTextEditorSelection(() => this.refreshAttachmentsStatus()),
			vscode.workspace.onDidChangeTextDocument((event) => {
				if (event.document === vscode.window.activeTextEditor?.document) {
					this.refreshAttachmentsStatus();
				}
			}),
		];
	}
}
