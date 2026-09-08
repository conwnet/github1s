import { jsonSchema, tool } from 'ai';
import { isPlainObject } from 'lodash-es';
import * as vscode from 'vscode';

import {
	entryType,
	errorMessage,
	hasOnlyKeys,
	invalidToolInput,
	normalizeWorkspacePath,
	readUtf8TextFile,
	resolveWorkspacePath,
	type ToolValidationResult,
} from './common';
import { formatToolOutput } from './output';

interface ReadToolInput {
	path: string;
	offset?: number;
	limit?: number;
}

const READ_LINE_LIMIT = 2000;
const READ_LINE_CHARACTER_LIMIT = 2000;

const readFile = async (input: ReadToolInput): Promise<string> => {
	const path = normalizeWorkspacePath(input.path);
	if (!path) {
		throw new Error('Path must stay within the workspace.');
	}
	const offset = input.offset ?? 1;
	const limit = input.limit ?? READ_LINE_LIMIT;
	const uri = resolveWorkspacePath(path);
	const stat = await vscode.workspace.fs.stat(uri);
	if (entryType(stat.type) !== 'file') {
		throw new Error(`Cannot read "${path}": path is not a file.`);
	}
	let content: string;
	try {
		content = await readUtf8TextFile(uri, stat.size);
	} catch (error) {
		throw new Error(`Cannot read "${path}": ${errorMessage(error)}`);
	}
	const lines = content.length === 0 ? [] : content.split(/\r?\n/);
	if (lines.length === 0) {
		if (offset !== 1) {
			throw new Error(`Cannot read "${path}": offset ${offset} is beyond the end of the empty file.`);
		}
		return '[File is empty.]';
	}
	const start = offset - 1;
	if (start >= lines.length) {
		throw new Error(`Cannot read "${path}": offset ${offset} is beyond the end of the file (${lines.length} lines).`);
	}
	const selected = lines.slice(start, start + limit);
	return formatToolOutput(
		selected.map((line, index) => `${offset + index}\t${renderLine(line)}`),
		(includedLines) => {
			const nextOffset = offset + includedLines;
			if (includedLines < selected.length) return `[Output capped. Continue with offset=${nextOffset}.]`;
			if (start + includedLines < lines.length) return `[More lines available. Continue with offset=${nextOffset}.]`;
			return `[End of file. Total lines: ${lines.length}.]`;
		},
	);
};

const validateReadToolInput = (value: unknown): ToolValidationResult<ReadToolInput> => {
	if (!isPlainObject(value)) {
		return invalidToolInput('read requires a non-empty string path.');
	}
	const input = value as Record<string, unknown>;
	if (!hasOnlyKeys(input, ['path', 'offset', 'limit'])) {
		return invalidToolInput('read accepts only path, offset, and limit.');
	}
	const path = input.path;
	if (typeof path !== 'string' || path.length === 0) {
		return invalidToolInput('read requires a non-empty string path.');
	}
	const offset = input.offset ?? undefined;
	if (offset !== undefined && (!Number.isSafeInteger(offset) || (offset as number) < 1)) {
		return invalidToolInput('read offset must be a positive integer.');
	}
	const limit = input.limit ?? undefined;
	if (
		limit !== undefined &&
		(!Number.isSafeInteger(limit) || (limit as number) <= 0 || (limit as number) > READ_LINE_LIMIT)
	) {
		return invalidToolInput(`read limit must be an integer between 1 and ${READ_LINE_LIMIT}.`);
	}

	return {
		success: true,
		value: {
			path,
			...(offset === undefined ? {} : { offset: offset as number }),
			...(limit === undefined ? {} : { limit: limit as number }),
		},
	};
};

const renderLine = (line: string): string =>
	line.length > READ_LINE_CHARACTER_LIMIT ? `${line.slice(0, READ_LINE_CHARACTER_LIMIT)}… [line truncated]` : line;

export const createReadTool = () =>
	tool({
		description: 'Read a UTF-8 text file and return line-numbered content.',
		// Preserve optional arguments instead of relying on provider-specific strict schema normalization.
		strict: false,
		inputSchema: jsonSchema<ReadToolInput>(
			{
				type: 'object',
				additionalProperties: false,
				required: ['path'],
				properties: {
					path: {
						type: 'string',
						minLength: 1,
						description: 'Workspace-relative path to a text file.',
					},
					offset: {
						type: 'integer',
						minimum: 1,
						default: 1,
						description: 'One-based first line to return. Defaults to 1.',
					},
					limit: {
						type: 'integer',
						minimum: 1,
						maximum: READ_LINE_LIMIT,
						default: READ_LINE_LIMIT,
						description: `Maximum number of lines to return. Defaults to ${READ_LINE_LIMIT}.`,
					},
				},
			},
			{ validate: validateReadToolInput },
		),
		execute: readFile,
	});
