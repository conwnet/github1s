import { jsonSchema, tool } from 'ai';
import { isPlainObject } from 'lodash-es';
import * as vscode from 'vscode';

import {
	entryType,
	hasOnlyKeys,
	invalidToolInput,
	normalizeWorkspacePath,
	resolveWorkspacePath,
	type ToolValidationResult,
	type WorkspaceEntryType,
} from './common';
import { formatToolOutput } from './output';

interface WorkspaceDirectoryEntry {
	name: string;
	type: WorkspaceEntryType;
}

interface LsToolInput {
	path: string;
	offset?: number;
	limit?: number;
}

const listDirectory = async (input: LsToolInput): Promise<string> => {
	const path = normalizeWorkspacePath(input.path, true);
	if (!path) {
		throw new Error('Path must stay within the workspace.');
	}
	const offset = input.offset ?? 1;
	const limit = input.limit ?? 200;
	const uri = resolveWorkspacePath(path);
	const stat = await vscode.workspace.fs.stat(uri);
	if (entryType(stat.type) !== 'directory') {
		throw new Error(`Cannot list "${path}": path is not a directory.`);
	}
	const entries = (await vscode.workspace.fs.readDirectory(uri))
		.map(([name, type]): WorkspaceDirectoryEntry => ({ name, type: entryType(type) }))
		.sort(compareDirectoryEntries);
	if (entries.length === 0) {
		if (offset !== 1) {
			throw new Error(`Cannot list "${path}": offset ${offset} is beyond the end of the empty directory.`);
		}
		return '[Directory is empty.]';
	}
	const start = offset - 1;
	if (start >= entries.length) {
		throw new Error(
			`Cannot list "${path}": offset ${offset} is beyond the end of the directory (${entries.length} entries).`,
		);
	}
	const visible = entries.slice(start, start + limit);
	return formatToolOutput(
		visible.map(({ type, name }) => `[${type}] ${name}`),
		(includedLines) => {
			const omitted = entries.length - start - includedLines;
			return omitted > 0 ? continuationMarker(omitted, offset + includedLines) : '';
		},
	);
};

const continuationMarker = (omitted: number, offset: number): string =>
	`[${omitted} additional entries omitted. Continue with offset=${offset}.]`;

const validateLsToolInput = (value: unknown): ToolValidationResult<LsToolInput> => {
	if (!isPlainObject(value)) {
		return invalidToolInput('ls requires a non-empty string path.');
	}
	const input = value as Record<string, unknown>;
	if (!hasOnlyKeys(input, ['path', 'offset', 'limit'])) {
		return invalidToolInput('ls accepts only path, offset, and limit.');
	}
	const path = input.path;
	if (typeof path !== 'string' || path.length === 0) {
		return invalidToolInput('ls requires a non-empty string path.');
	}
	const offset = input.offset ?? undefined;
	if (offset !== undefined && (!Number.isSafeInteger(offset) || (offset as number) < 1)) {
		return invalidToolInput('ls offset must be a positive integer.');
	}
	const limit = input.limit ?? undefined;
	if (limit !== undefined && (!Number.isSafeInteger(limit) || (limit as number) <= 0)) {
		return invalidToolInput('ls limit must be a positive integer.');
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

const compareDirectoryEntries = (left: WorkspaceDirectoryEntry, right: WorkspaceDirectoryEntry): number => {
	const typeDifference = entryTypeRank(left.type) - entryTypeRank(right.type);
	if (typeDifference !== 0) {
		return typeDifference;
	}
	return left.name.localeCompare(right.name, 'en');
};

const entryTypeRank = (type: WorkspaceEntryType): number => {
	if (type === 'directory') return 0;
	if (type === 'file') return 1;
	return 2;
};

export const createLsTool = () =>
	tool({
		description: 'List one directory level, with directories before files.',
		strict: false,
		inputSchema: jsonSchema<LsToolInput>(
			{
				type: 'object',
				additionalProperties: false,
				required: ['path'],
				properties: {
					path: {
						type: 'string',
						minLength: 1,
						description: 'Workspace-relative directory path. Use "." for the workspace root.',
					},
					offset: {
						type: 'integer',
						minimum: 1,
						default: 1,
						description: 'One-based first entry to return in the sorted listing. Defaults to 1.',
					},
					limit: {
						type: 'integer',
						minimum: 1,
						default: 200,
						description: 'Maximum number of entries to list. Defaults to 200.',
					},
				},
			},
			{ validate: validateLsToolInput },
		),
		execute: listDirectory,
	});
