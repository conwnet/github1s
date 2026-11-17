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

export interface WorkspaceConversationHistory {
	workspaceKey: string;
	conversations: Conversation[];
}

export interface ConversationHistory {
	exportedAt: string;
	workspaces: WorkspaceConversationHistory[];
}

export type HistoryImportOptions = { mode: 'merge'; conflicts: 'keep' | 'overwrite' } | { mode: 'replace' };

export const isConversationSummary = (value: unknown): value is ConversationSummary => {
	if (!isPlainObject(value)) return false;
	const summary = value as Record<string, unknown>;
	return (
		typeof summary.id === 'string' &&
		summary.id.length > 0 &&
		typeof summary.title === 'string' &&
		typeof summary.createdAt === 'number' &&
		Number.isFinite(summary.createdAt) &&
		summary.createdAt >= 0 &&
		typeof summary.updatedAt === 'number' &&
		Number.isFinite(summary.updatedAt) &&
		summary.updatedAt >= summary.createdAt &&
		(summary.usage === undefined || isLanguageModelUsage(summary.usage))
	);
};

const isLanguageModelUsage = (value: unknown): value is LanguageModelUsage => {
	if (!isPlainObject(value)) return false;
	const usage = value as Record<string, unknown>;
	const inputTokenDetails = usage.inputTokenDetails;
	const outputTokenDetails = usage.outputTokenDetails;
	if (!isPlainObject(inputTokenDetails) || !isPlainObject(outputTokenDetails)) return false;
	const input = inputTokenDetails as Record<string, unknown>;
	const output = outputTokenDetails as Record<string, unknown>;
	return (
		isTokenCount(usage.inputTokens) &&
		isTokenCount(input.noCacheTokens) &&
		isTokenCount(input.cacheReadTokens) &&
		isTokenCount(input.cacheWriteTokens) &&
		isTokenCount(usage.outputTokens) &&
		isTokenCount(output.textTokens) &&
		isTokenCount(output.reasoningTokens) &&
		isTokenCount(usage.totalTokens)
	);
};

const isTokenCount = (value: unknown): value is number | undefined =>
	value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= 0);

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

export const isConversationWorkspaceKey = (value: unknown): value is string =>
	typeof value === 'string' && (value === 'empty-workspace' || /^[a-f0-9]{40}$/.test(value));

export const parseConversationHistory = async (json: string): Promise<ConversationHistory> => {
	let value: unknown;
	try {
		value = JSON.parse(json);
	} catch {
		throw new Error('Invalid JSON file.');
	}
	if (!isPlainObject(value)) throw new Error('Invalid history file.');
	const history = value as Record<string, unknown>;
	if (
		typeof history.exportedAt !== 'string' ||
		!Number.isFinite(Date.parse(history.exportedAt)) ||
		!Array.isArray(history.workspaces)
	) {
		throw new Error('Invalid history file.');
	}

	const workspaceKeys = new Set<string>();
	const workspaces: WorkspaceConversationHistory[] = [];
	for (const value of history.workspaces) {
		if (!isPlainObject(value)) throw new Error('Invalid workspace history.');
		const workspace = value as Record<string, unknown>;
		if (!isConversationWorkspaceKey(workspace.workspaceKey) || !Array.isArray(workspace.conversations)) {
			throw new Error('Invalid workspace history.');
		}
		if (workspaceKeys.has(workspace.workspaceKey)) throw new Error('Duplicate workspace.');
		workspaceKeys.add(workspace.workspaceKey);

		const ids = new Set<string>();
		const conversations: Conversation[] = [];
		for (const value of workspace.conversations) {
			if (!isConversationSummary(value) || !/^[a-zA-Z0-9_-]+$/.test(value.id)) {
				throw new Error('Invalid conversation.');
			}
			if (ids.has(value.id)) throw new Error(`Duplicate conversation ID: ${value.id}.`);
			ids.add(value.id);
			const conversation = value as Conversation;
			let messages: Conversation['messages'];
			try {
				messages = await validateConversationMessages(conversation.messages);
			} catch {
				throw new Error(`Invalid messages in conversation: ${conversation.id}.`);
			}
			conversations.push({
				id: conversation.id,
				title: conversation.title,
				createdAt: conversation.createdAt,
				updatedAt: conversation.updatedAt,
				...(conversation.usage === undefined ? {} : { usage: conversation.usage }),
				messages,
			});
		}
		workspaces.push({ workspaceKey: workspace.workspaceKey, conversations });
	}
	return { exportedAt: history.exportedAt, workspaces };
};
