import type { ContextAttachmentDescriptor, ContextReference } from './context';
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
		recentFiles?: ContextReference[];
		includeRecentFiles?: boolean;
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
