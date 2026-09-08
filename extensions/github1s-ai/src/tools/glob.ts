import { jsonSchema, tool } from 'ai';
import { isPlainObject } from 'lodash-es';
import * as vscode from 'vscode';

import {
	entryType,
	errorMessage,
	hasOnlyKeys,
	invalidToolInput,
	normalizeWorkspacePath,
	resolveWorkspacePath,
	runWorkspaceSearch,
	type ToolValidationResult,
} from './common';
import { formatToolOutput } from './output';

interface GlobToolInput {
	pattern: string;
	path?: string;
}

export const GLOB_MAX_RESULTS = 100;

const findWorkspaceFiles = async (input: GlobToolInput, abortSignal?: AbortSignal): Promise<string> => {
	const pattern = normalizeGlobPattern(input.pattern);
	if (!pattern) {
		throw new Error('glob requires a non-empty string pattern.');
	}

	const path = input.path === undefined ? '.' : normalizeWorkspacePath(input.path, true);
	if (!path) {
		throw new Error('Path must stay within the workspace.');
	}

	const root = resolveWorkspacePath(path);
	if (input.path !== undefined) {
		const stat = await vscode.workspace.fs.stat(root);
		if (entryType(stat.type) !== 'directory') {
			throw new Error(`Cannot search "${path}": path is not a directory.`);
		}
	}

	const include = new vscode.RelativePattern(root, pattern);
	let matches: vscode.Uri[];
	try {
		matches = await runWorkspaceSearch(
			(token) => vscode.workspace.findFiles(include, null, GLOB_MAX_RESULTS + 1, token),
			abortSignal,
		);
	} catch (error) {
		throw new Error(`Workspace file search failed: ${errorMessage(error)}`);
	}
	if (matches.length === 0) {
		return '[No files returned by workspace file search; this does not prove absence.]';
	}

	const paths = matches
		.slice(0, GLOB_MAX_RESULTS)
		.map((uri) => vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/'));
	return formatGlobOutput(paths, matches.length > GLOB_MAX_RESULTS);
};

const normalizeGlobPattern = (value: string): string | undefined => {
	if (value.trim().length === 0 || value.includes('\0')) {
		return undefined;
	}

	const pattern = value.replace(/\\/g, '/');
	return pattern.includes('/') ? pattern : `**/${pattern}`;
};

const formatGlobOutput = (paths: readonly string[], hasMore: boolean): string => {
	const omittedMarker = '[Additional matching files omitted. Narrow the pattern or path to see more.]';
	const completedMarker = '[Workspace file search completed; results are best-effort and may be incomplete.]';
	return formatToolOutput(paths, (includedLines) =>
		hasMore || includedLines < paths.length ? omittedMarker : completedMarker,
	);
};

const validateGlobToolInput = (value: unknown): ToolValidationResult<GlobToolInput> => {
	if (!isPlainObject(value)) {
		return invalidToolInput('glob requires a non-empty string pattern.');
	}
	const input = value as Record<string, unknown>;
	if (!hasOnlyKeys(input, ['pattern', 'path'])) {
		return invalidToolInput('glob accepts only pattern and path.');
	}
	const pattern = input.pattern;
	if (typeof pattern !== 'string' || !normalizeGlobPattern(pattern)) {
		return invalidToolInput('glob requires a non-empty string pattern.');
	}
	const path = input.path ?? undefined;
	if (path !== undefined && (typeof path !== 'string' || path.trim().length === 0)) {
		return invalidToolInput('glob path must be a non-empty string when provided.');
	}

	return {
		success: true,
		value: {
			pattern,
			...(path === undefined ? {} : { path: path as string }),
		},
	};
};

export const createGlobTool = () =>
	tool({
		description: 'Find workspace-relative file paths matching a glob. Results are best-effort, possibly incomplete.',
		strict: false,
		inputSchema: jsonSchema<GlobToolInput>(
			{
				type: 'object',
				additionalProperties: false,
				required: ['pattern'],
				properties: {
					pattern: {
						type: 'string',
						minLength: 1,
						description:
							'Glob pattern for file paths, for example "**/*.ts" or "src/**/*.test.js". A pattern without "/" searches file names at any depth.',
					},
					path: {
						type: 'string',
						minLength: 1,
						description:
							'Optional workspace-relative directory to search. The pattern is relative to this directory. Defaults to the workspace root.',
					},
				},
			},
			{ validate: validateGlobToolInput },
		),
		execute: (input, { abortSignal }) => findWorkspaceFiles(input, abortSignal),
	});
