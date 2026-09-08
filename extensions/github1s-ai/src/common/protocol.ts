import { isPlainObject } from 'lodash-es';

import {
	isContextAttachmentAction,
	isContextAttachmentDescriptor,
	type ContextAttachmentAction,
	type ContextAttachmentDescriptor,
} from '@/contexts/types';
import { exactString, hasExactKeys } from '@/helpers/validate';

import type { ConversationSummary } from './conversation';
import type { SyntaxHighlightingData } from './highlighting';
import type { McpConfig } from './mcp-config';
import { isModelConfigInput, type ModelConfigInput, type ModelConfigSummary } from './model-config';
import { isPromptsConfig, type PromptsConfig } from './prompts-config';
import { isQuickAction, type ChatQuickAction } from './quick-actions';
import type { RuntimeState } from './state';

export type { ContextAttachmentDescriptor } from '@/contexts/types';
export type { ModelConfigInput } from './model-config';
export type { Notice } from './state';

export const MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH = 100_000;

export interface ViewState {
	runtime: RuntimeState;
	promptsConfig: PromptsConfig;
	modelConfigs: {
		selectedId?: string;
		configs: ModelConfigSummary[];
	};
	mcpConfig?: McpConfig;
	conversations: ConversationSummary[];
}

export interface MarkdownHighlightRequest {
	type: 'markdown.highlight';
	requestId: string;
	languageId: string;
	source: string;
}

type AllViewEvents =
	| { type: 'app.ready' }
	| { type: 'app.newChat' }
	| { type: 'app.openChat' }
	| { type: 'app.openHistory' }
	| { type: 'app.openSettings' }
	| { type: 'chat.send'; text: string }
	| { type: 'chat.runQuickAction'; action: ChatQuickAction }
	| { type: 'chat.addContextAttachment'; action: ContextAttachmentAction }
	| { type: 'chat.addContextAttachment'; action: 'descriptor'; descriptor: ContextAttachmentDescriptor }
	| { type: 'chat.removeContextAttachment'; id: string }
	| { type: 'chat.cancel' }
	| { type: 'history.selectConversation'; id: string }
	| { type: 'history.deleteConversation'; id: string }
	| { type: 'settings.selectModelConfig'; id: string }
	| { type: 'settings.clearFeedback' }
	| { type: 'settings.exportHistory' }
	| { type: 'settings.clearAllData' }
	| { type: 'settings.saveModelConfig'; config: ModelConfigInput }
	| { type: 'settings.savePromptsConfig'; config: PromptsConfig }
	| { type: 'settings.saveMcpConfig'; json: string }
	| { type: 'settings.deleteModelConfig'; id: string };

export type ViewEvent<K extends AllViewEvents['type'] = AllViewEvents['type']> = Extract<AllViewEvents, { type: K }>;

export type ViewRequest = ViewEvent | MarkdownHighlightRequest;

export type ViewMessage =
	| { type: 'app.setState'; state: ViewState }
	| { type: 'settings.historyExport'; filename: string; content: string }
	| { type: 'markdown.highlightResult'; requestId: string; highlighting?: SyntaxHighlightingData }
	| { type: 'markdown.highlightingChanged' };

export const parseMarkdownHighlightRequest = (value: unknown): MarkdownHighlightRequest | undefined => {
	if (!isPlainObject(value)) return undefined;
	const request = value as Record<string, unknown>;
	if (
		!hasExactKeys(request, ['type', 'requestId', 'languageId', 'source']) ||
		request.type !== 'markdown.highlight' ||
		typeof request.requestId !== 'string' ||
		request.requestId.length === 0 ||
		request.requestId.length > 100 ||
		typeof request.languageId !== 'string' ||
		request.languageId.length === 0 ||
		request.languageId.length > 100 ||
		typeof request.source !== 'string' ||
		request.source.length > MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH
	) {
		return undefined;
	}
	return {
		type: request.type,
		requestId: request.requestId,
		languageId: request.languageId,
		source: request.source,
	};
};

export const parseViewEvent = (value: unknown): ViewEvent | undefined => {
	if (!isPlainObject(value)) return undefined;
	const event = value as Record<string, unknown>;
	if (typeof event.type !== 'string') return undefined;
	switch (event.type) {
		case 'app.ready':
		case 'app.newChat':
		case 'app.openChat':
		case 'app.openHistory':
		case 'app.openSettings':
		case 'chat.cancel':
		case 'settings.clearFeedback':
		case 'settings.exportHistory':
		case 'settings.clearAllData':
			return hasExactKeys(event, ['type']) ? { type: event.type } : undefined;

		case 'chat.send':
			return hasExactKeys(event, ['type', 'text']) && typeof event.text === 'string'
				? { type: event.type, text: event.text }
				: undefined;

		case 'chat.removeContextAttachment':
		case 'history.selectConversation':
		case 'history.deleteConversation':
		case 'settings.selectModelConfig':
		case 'settings.deleteModelConfig':
			return exactString(event, 'id') ? { type: event.type, id: event.id as string } : undefined;

		case 'chat.runQuickAction':
			return exactString(event, 'action') && isQuickAction(event.action)
				? { type: event.type, action: event.action }
				: undefined;

		case 'chat.addContextAttachment':
			if (event.action === 'descriptor') {
				return hasExactKeys(event, ['type', 'action', 'descriptor']) && isContextAttachmentDescriptor(event.descriptor)
					? { type: event.type, action: event.action, descriptor: event.descriptor }
					: undefined;
			}
			return exactString(event, 'action') && isContextAttachmentAction(event.action)
				? { type: event.type, action: event.action }
				: undefined;

		case 'settings.saveModelConfig': {
			if (!hasExactKeys(event, ['type', 'config'])) return undefined;
			return isModelConfigInput(event.config) ? { type: event.type, config: event.config } : undefined;
		}
		case 'settings.savePromptsConfig':
			return hasExactKeys(event, ['type', 'config']) && isPromptsConfig(event.config)
				? { type: event.type, config: event.config }
				: undefined;
		case 'settings.saveMcpConfig':
			return exactString(event, 'json') ? { type: event.type, json: event.json as string } : undefined;
		default:
			return undefined;
	}
};
