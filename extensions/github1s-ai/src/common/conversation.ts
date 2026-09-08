import { jsonSchema, validateUIMessages, type LanguageModelUsage, type UIMessage } from 'ai';
import { isPlainObject } from 'lodash-es';

import type { ContextAttachment } from '@/contexts/types';

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
	error?: string;
}

export type ConversationMessageData = {
	attachments: ContextAttachment[];
};

type BaseConversationMessage = UIMessage<ConversationMessageMetadata, ConversationMessageData>;

export type ConversationMessage = Omit<BaseConversationMessage, 'metadata'> & {
	metadata: ConversationMessageMetadata; // make it required
};

export interface Conversation extends ConversationSummary {
	messages: ConversationMessage[];
}

export const createUserMessage = (
	turnId: string,
	text: string,
	attachments: readonly ContextAttachment[],
): ConversationMessage => ({
	id: turnId,
	role: 'user',
	metadata: { turnId, status: 'completed' },
	parts: [
		...(attachments.length > 0
			? [
					{
						type: 'data-attachments' as const,
						data: attachments.map((attachment) => ({ ...attachment })),
					},
				]
			: []),
		{ type: 'text', text },
	],
});

export const createAssistantMessage = (id: string, turnId: string): ConversationMessage => ({
	id,
	role: 'assistant',
	metadata: { turnId, status: 'streaming' },
	parts: [],
});

export const withMessageStatus = (
	message: ConversationMessage,
	status: ConversationMessageStatus,
	error?: string,
): ConversationMessage => ({
	...message,
	metadata: {
		turnId: message.metadata.turnId,
		status,
		...(error ? { error } : {}),
	},
});

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
				id: { type: 'string' },
				type: { enum: ['file', 'selection'] },
				label: { type: 'string' },
				source: { type: 'string' },
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

export const validateConversationMessages = (messages: unknown): Promise<ConversationMessage[]> =>
	validateUIMessages<ConversationMessage>({
		messages,
		metadataSchema,
		dataSchemas: { attachments: attachmentsSchema },
	});

const isConversationMessageMetadata = (value: unknown): value is ConversationMessageMetadata => {
	if (!isPlainObject(value)) return false;
	const metadata = value as Record<string, unknown>;
	return (
		Object.keys(metadata).every((key) => key === 'turnId' || key === 'status' || key === 'error') &&
		typeof metadata.turnId === 'string' &&
		metadata.turnId.length > 0 &&
		(metadata.status === 'streaming' ||
			metadata.status === 'completed' ||
			metadata.status === 'failed' ||
			metadata.status === 'aborted' ||
			metadata.status === 'unknown') &&
		(metadata.error === undefined || typeof metadata.error === 'string')
	);
};

const isContextAttachment = (value: unknown): value is ContextAttachment => {
	if (!isPlainObject(value)) return false;
	const attachment = value as Record<string, unknown>;
	return (
		Object.keys(attachment).every(
			(key) =>
				key === 'id' ||
				key === 'type' ||
				key === 'label' ||
				key === 'source' ||
				key === 'languageId' ||
				key === 'content',
		) &&
		typeof attachment.id === 'string' &&
		attachment.id.length > 0 &&
		(attachment.type === 'file' || attachment.type === 'selection') &&
		typeof attachment.label === 'string' &&
		typeof attachment.source === 'string' &&
		(attachment.languageId === undefined || typeof attachment.languageId === 'string') &&
		typeof attachment.content === 'string'
	);
};
