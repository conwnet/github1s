import { markStreamingMessagesUnknown, type Conversation } from '@/common/conversation';
import type { ViewEvent } from '@/common/protocol';
import type { Stores } from '@/stores';

import { Controller } from './common';
import type { ConversationRunner } from './runner';

export class HistoryController extends Controller {
	constructor(
		stores: Stores,
		private readonly runner: ConversationRunner,
	) {
		super(stores);
	}

	@Controller.handler('history.selectConversation')
	async handleSelectConversation(event: ViewEvent<'history.selectConversation'>): Promise<void> {
		await this.runner.cancelPreparation();
		let conversation: Conversation | undefined;
		let loadError: string | undefined;
		try {
			conversation = await this.stores.conversations.get(event.id);
			if (conversation) await this.stores.conversations.select(event.id);
			if (!conversation) loadError = 'Unable to load the conversation. Its messages are missing or invalid.';
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			loadError = `Unable to load the conversation. ${detail}`;
		}
		if (conversation && !this.runner.isRequestActive(conversation.id)) {
			conversation = markStreamingMessagesUnknown(conversation);
		}
		const runtime = await this.stores.runtime.get();
		await this.stores.runtime.set({
			...runtime,
			page: 'chat' as const,
			chat: {
				...runtime.chat,
				conversation,
				...(runtime.chat.conversation?.id !== event.id ? { pendingAttachments: [] } : {}),
				notice: loadError ? { severity: 'error' as const, message: loadError } : undefined,
			},
			history: { ...runtime.history, notice: undefined },
		});
	}

	@Controller.handler('history.deleteConversation')
	async handleDeleteConversation(event: ViewEvent<'history.deleteConversation'>): Promise<void> {
		const selected = (await this.stores.runtime.get()).chat.conversation?.id === event.id;
		if (selected) await this.runner.cancelPreparation();
		await this.runner.cancelConversation(event.id);
		try {
			await this.stores.conversations.delete(event.id);
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Unknown error.';
			await this.stores.runtime.setIn('history.notice', {
				severity: 'error',
				message: `Unable to delete the conversation. ${detail}`,
			});
			return;
		}
		const runtime = await this.stores.runtime.get();
		await this.stores.runtime.set({
			...runtime,
			page: 'history' as const,
			chat: {
				...runtime.chat,
				...(runtime.chat.conversation?.id === event.id ? { conversation: undefined, pendingAttachments: [] } : {}),
			},
			history: { ...runtime.history, notice: undefined },
		});
	}
}
