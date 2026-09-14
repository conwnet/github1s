import * as vscode from 'vscode';

import { markStreamingMessagesUnknown } from '@/common/conversation';
import type { ViewEvent } from '@/common/protocol';
import type { RuntimeState } from '@/common/state';
import type { Stores } from '@/stores';

import { Controller } from './common';
import type { ConversationRunner } from './runner';

export class AppController extends Controller {
	constructor(
		stores: Stores,
		private readonly runner: ConversationRunner,
	) {
		super(stores);
	}

	@Controller.handler('app.ready')
	async handleReady(_event: ViewEvent<'app.ready'>): Promise<void> {
		const runtime = await this.stores.runtime.get();
		if (runtime.chat.conversation) return;
		const conversation = await this.stores.conversations.getSelected().catch(() => undefined);
		if (!conversation) return;
		const currentConversation = this.runner.isRequestActive(conversation.id)
			? conversation
			: markStreamingMessagesUnknown(conversation);
		await this.stores.runtime.setIn('chat.conversation', currentConversation);
	}

	@Controller.handler('app.newChat')
	async handleNewChat(_event: ViewEvent<'app.newChat'>): Promise<void> {
		await this.stores.conversations.select(undefined);
		await this.openPage('chat', true);
	}

	@Controller.handler('app.openChat')
	async handleOpenChat(_event: ViewEvent<'app.openChat'>): Promise<void> {
		await this.openPage('chat');
	}

	@Controller.handler('app.openHistory')
	async handleOpenHistory(_event: ViewEvent<'app.openHistory'>): Promise<void> {
		await this.openPage('history');
	}

	@Controller.handler('app.openSettings')
	async handleOpenSettings(_event: ViewEvent<'app.openSettings'>): Promise<void> {
		await this.openPage('settings');
	}

	@Controller.handler('app.openFile')
	async handleOpenFile(event: ViewEvent<'app.openFile'>): Promise<void> {
		const uri = vscode.Uri.parse(event.source);
		const match = /^L(\d+):(\d+)-L(\d+):(\d+)$/.exec(uri.fragment);
		const positions = match?.slice(1).map(Number);
		let selection: vscode.Range | undefined;
		if (positions && positions.every((position) => position >= 1)) {
			const [startLine, startCharacter, endLine, endCharacter] = positions;
			selection = new vscode.Range(startLine - 1, startCharacter - 1, endLine - 1, endCharacter - 1);
		}
		await vscode.window.showTextDocument(uri.with({ fragment: '' }), { selection });
	}

	private async openPage(page: RuntimeState['page'], resetConversation = false): Promise<void> {
		await this.runner.cancelPreparation();
		const runtime = await this.stores.runtime.get();
		await this.stores.runtime.set({
			...runtime,
			page,
			chat: {
				...runtime.chat,
				...(resetConversation ? { conversation: undefined, pendingAttachments: [] } : {}),
				...(resetConversation || page !== 'chat' ? { notice: undefined } : {}),
			},
			history: { ...runtime.history, notice: undefined },
			settings: { ...runtime.settings, feedback: undefined },
		});
	}
}
