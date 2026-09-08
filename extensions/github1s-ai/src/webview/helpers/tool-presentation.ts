import type { DynamicToolUIPart, ToolUIPart } from 'ai';

import type { ConversationMessage, ConversationMessageStatus } from '@/common/conversation';

export type ChatToolPart = ToolUIPart | DynamicToolUIPart;

export interface ToolActivity {
	toolCallId: string;
	toolName: string;
	target?: string;
	status: 'running' | 'success' | 'error' | 'missing';
	statusLabel: 'Running' | 'Done' | 'Failed' | 'No result';
	input: string;
	output?: string;
}

const STATUS_LABELS = {
	running: 'Running',
	success: 'Done',
	error: 'Failed',
	missing: 'No result',
} as const satisfies Record<ToolActivity['status'], ToolActivity['statusLabel']>;

const MAX_TARGET_LENGTH = 80;

export const isChatToolPart = (part: ConversationMessage['parts'][number]): part is ChatToolPart =>
	part.type === 'dynamic-tool' || part.type.startsWith('tool-');

export const createToolActivity = (part: ChatToolPart, messageStatus: ConversationMessageStatus): ToolActivity => {
	const status = toolActivityStatus(part, messageStatus);
	const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.slice('tool-'.length);
	const input = formatValue(part.input);
	const target = toolTarget(toolName, part.input);
	const output = toolOutput(part);

	return {
		toolCallId: part.toolCallId,
		toolName,
		...(target ? { target } : {}),
		status,
		statusLabel: STATUS_LABELS[status],
		input,
		...(output === undefined ? {} : { output }),
	};
};

export const toolActivityStatus = (
	part: ChatToolPart,
	messageStatus: ConversationMessageStatus,
): ToolActivity['status'] => {
	if (part.state === 'output-available') {
		return part.preliminary === true && messageStatus === 'streaming' ? 'running' : 'success';
	}
	if (part.state === 'output-error' || part.state === 'output-denied') return 'error';
	return messageStatus === 'streaming' ? 'running' : 'missing';
};

const toolOutput = (part: ChatToolPart): string | undefined => {
	if (part.state === 'output-available') return formatValue(part.output);
	if (part.state === 'output-error') return part.errorText;
	if (part.state === 'output-denied') return part.approval.reason ?? 'Execution denied.';
	return undefined;
};

const toolTarget = (toolName: string, input: unknown): string | undefined => {
	if ((toolName === 'read' || toolName === 'ls') && isRecord(input)) {
		const path = input.path;
		if (typeof path === 'string' && path) return path;
	}
	if (toolName === 'glob' && isRecord(input)) {
		const pattern = input.pattern;
		if (typeof pattern === 'string' && pattern) {
			const path = input.path;
			return compact(typeof path === 'string' && path ? `${pattern} in ${path}` : pattern);
		}
	}
	if (toolName === 'search' && isRecord(input)) {
		const query = input.query;
		if (typeof query === 'string' && query) {
			const path = input.path;
			return compact(typeof path === 'string' && path ? `${query} in ${path}` : query);
		}
	}
	return compact(formatValue(input));
};

const formatValue = (value: unknown): string => {
	if (value === undefined) return '';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value, undefined, 2) ?? String(value);
	} catch {
		return String(value);
	}
};

const compact = (value: string): string | undefined => {
	const singleLine = value.replace(/\s+/g, ' ').trim();
	if (!singleLine) return undefined;
	return singleLine.length > MAX_TARGET_LENGTH ? `${singleLine.slice(0, MAX_TARGET_LENGTH - 1)}…` : singleLine;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
