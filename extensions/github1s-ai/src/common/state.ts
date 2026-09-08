import type { ContextAttachmentDescriptor } from '@/contexts/types';

import type { Conversation } from './conversation';

export interface Notice {
	severity: 'success' | 'error';
	message: string;
}

export interface RuntimeState {
	page: 'chat' | 'history' | 'settings';
	chat: {
		conversation?: Conversation;
		currentFile?: ContextAttachmentDescriptor;
		currentSelection?: ContextAttachmentDescriptor;
		pendingAttachments?: ContextAttachmentDescriptor[];
		preparing?: boolean;
		notice?: Notice;
	};
	history: {
		notice?: Notice;
	};
	settings: {
		feedback?: Notice;
	};
}
