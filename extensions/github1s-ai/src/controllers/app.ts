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
