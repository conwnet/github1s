import { jsonSchema, validateUIMessages, type LanguageModelUsage, type UIMessage } from 'ai';
import { isPlainObject } from 'lodash-es';

import { isContextAttachment, isContextReference, type ContextAttachment, type ContextReference } from './context';

export interface ConversationSummary {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	usage?: LanguageModelUsage;
}

export type ConversationMessageStatus = 'streaming' | 'completed' | 'failed' | 'aborted' | 'unknown';

export interface ConversationMessageMetadata {
	turnId: string;
	status: ConversationMessageStatus;
	modelId?: string;
	createdAt?: number;
	error?: string;
}

export type ConversationMessageData = {
	attachments: ContextAttachment[];
	recentFiles: ContextReference[];
};

type BaseConversationMessage = UIMessage<ConversationMessageMetadata, ConversationMessageData>;

export type ConversationMessage = Omit<BaseConversationMessage, 'metadata'> & {
	metadata: ConversationMessageMetadata; // make it required
};

export interface Conversation extends ConversationSummary {
	messages: ConversationMessage[];
}

export const isInterruptedMessage = (message: ConversationMessage): boolean =>
	message.metadata.status === 'failed' ||
	message.metadata.status === 'aborted' ||
	message.metadata.status === 'unknown';

export const createUserMessage = (
	turnId: string,
	text: string,
	attachments: readonly ContextAttachment[],
	recentFiles: readonly ContextReference[] = [],
): ConversationMessage => {
	const parts: ConversationMessage['parts'] = [];
	if (recentFiles.length > 0) {
		parts.push({ type: 'data-recentFiles', data: recentFiles.map((reference) => ({ ...reference })) });
	}
	if (attachments.length > 0) {
		parts.push({ type: 'data-attachments', data: attachments.map((attachment) => ({ ...attachment })) });
	}
	parts.push({ type: 'text', text });
	return { id: turnId, role: 'user', metadata: { turnId, status: 'completed' }, parts };
};

export const createAssistantMessage = (
	id: string,
	metadata: Omit<ConversationMessageMetadata, 'status' | 'error'>,
): ConversationMessage => ({
	id,
	role: 'assistant',
	metadata: { ...metadata, status: 'streaming' },
	parts: [],
});

export const withMessageStatus = (
	message: ConversationMessage,
	status: ConversationMessageStatus,
	error?: string,
): ConversationMessage => {
	const { error: _previousError, ...metadata } = message.metadata;
	return { ...message, metadata: { ...metadata, status, ...(error ? { error } : {}) } };
};

export const markStreamingMessagesUnknown = (conversation: Conversation): Conversation => {
	const messages = conversation.messages.map((message) =>
		message.metadata.status === 'streaming' ? withMessageStatus(message, 'unknown') : message,
	);
	return messages.some((message, index) => message !== conversation.messages[index])
		? { ...conversation, messages }
		: conversation;
};

const metadataSchema = jsonSchema<ConversationMessageMetadata>(
	{
		type: 'object',
		additionalProperties: false,
		required: ['turnId', 'status'],
		properties: {
			turnId: { type: 'string', minLength: 1 },
			status: { enum: ['streaming', 'completed', 'failed', 'aborted', 'unknown'] },
			modelId: { type: 'string' },
			createdAt: { type: 'number' },
			error: { type: 'string' },
		},
	},
	{
		validate: (value) =>
			isConversationMessageMetadata(value)
				? { success: true, value }
				: { success: false, error: new Error('Invalid conversation message metadata') },
	},
);

const attachmentsSchema = jsonSchema<ContextAttachment[]>(
	{
		type: 'array',
		items: {
			type: 'object',
			additionalProperties: false,
			required: ['id', 'type', 'label', 'source', 'content'],
			properties: {
				id: { type: 'string', minLength: 1 },
				type: { enum: ['file', 'selection'] },
				label: { type: 'string' },
				source: { type: 'string', minLength: 1 },
				languageId: { type: 'string' },
				content: { type: 'string' },
			},
		},
	},
	{
		validate: (value) =>
			Array.isArray(value) && value.every(isContextAttachment)
				? { success: true, value }
				: { success: false, error: new Error('Invalid context attachments') },
	},
);

const recentFilesSchema = jsonSchema<ContextReference[]>(
	{
		type: 'array',
		items: {
			type: 'object',
			additionalProperties: false,
			required: ['source'],
			properties: { source: { type: 'string', minLength: 1 } },
		},
	},
	{
		validate: (value) =>
			Array.isArray(value) && value.every(isContextReference)
				? { success: true, value }
				: { success: false, error: new Error('Invalid recent files') },
	},
);

export const validateConversationMessages = (messages: unknown): Promise<ConversationMessage[]> =>
	validateUIMessages<ConversationMessage>({
		messages,
		metadataSchema,
		dataSchemas: { attachments: attachmentsSchema, recentFiles: recentFilesSchema },
	});

const isConversationMessageMetadata = (value: unknown): value is ConversationMessageMetadata => {
	if (!isPlainObject(value)) return false;
	const metadata = value as Record<string, unknown>;
	return (
		Object.keys(metadata).every((key) => ['turnId', 'status', 'modelId', 'createdAt', 'error'].includes(key)) &&
		typeof metadata.turnId === 'string' &&
		metadata.turnId.length > 0 &&
		(metadata.status === 'streaming' ||
			metadata.status === 'completed' ||
			metadata.status === 'failed' ||
			metadata.status === 'aborted' ||
			metadata.status === 'unknown') &&
		(metadata.modelId === undefined || typeof metadata.modelId === 'string') &&
		(metadata.createdAt === undefined ||
			(typeof metadata.createdAt === 'number' && Number.isFinite(metadata.createdAt))) &&
		(metadata.error === undefined || typeof metadata.error === 'string')
	);
};
