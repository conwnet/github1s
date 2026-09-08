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
	runWorkspaceSearch,
	type ToolValidationResult,
} from './common';
import { formatToolOutput } from './output';

interface SearchToolInput {
	query: string;
	path?: string;
	caseSensitive?: boolean;
	maxResults?: number;
}

interface WorkspaceTextSearchQuery {
	pattern: string;
	isCaseSensitive?: boolean;
}

interface WorkspaceTextSearchOptions {
	include?: vscode.GlobPattern;
	maxResults?: number;
	previewOptions?: {
		matchLines: number;
		charsPerLine: number;
	};
}

interface WorkspaceTextSearchMatch {
	uri: vscode.Uri;
	ranges: vscode.Range | vscode.Range[];
	preview: {
		text: string;
		matches: vscode.Range | vscode.Range[];
	};
}

interface WorkspaceTextSearchContext {
	uri: vscode.Uri;
	text: string;
	lineNumber: number;
}

interface WorkspaceTextSearchComplete {
	limitHit?: boolean;
}

type FindTextInFiles = (
	query: WorkspaceTextSearchQuery,
	options: WorkspaceTextSearchOptions,
	callback: (result: WorkspaceTextSearchMatch | WorkspaceTextSearchContext) => void,
	token?: vscode.CancellationToken,
) => PromiseLike<WorkspaceTextSearchComplete>;

const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS = 100;
const MAX_PREVIEW_CHARACTERS = 300;
const OUTPUT_LIMIT_MESSAGE = '[Search results incomplete: output limit reached.]';

const search = async (input: SearchToolInput, abortSignal?: AbortSignal): Promise<string> => {
	const path = input.path === undefined ? '.' : normalizeWorkspacePath(input.path, true);
	if (!path) {
		throw new Error('Path must stay within the workspace.');
	}

	const uri = resolveWorkspacePath(path);
	const stat = await vscode.workspace.fs.stat(uri);
	const type = entryType(stat.type);
	if (type === 'file') {
		return searchFile(uri, path, stat.size, input);
	}
	if (type === 'directory') {
		return searchWorkspace(path, input, abortSignal);
	}
	throw new Error(`Cannot search "${path}": path is not a file or directory.`);
};

const searchFile = async (uri: vscode.Uri, path: string, size: number, input: SearchToolInput): Promise<string> => {
	let content: string;
	try {
		content = await readUtf8TextFile(uri, size);
	} catch (error) {
		throw new Error(`Cannot search "${path}": ${errorMessage(error)}`);
	}

	const caseSensitive = input.caseSensitive ?? false;
	const query = caseSensitive ? input.query : input.query.toLowerCase();
	const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
	const matches: string[] = [];
	let limitHit = false;

	for (const [index, line] of content.split(/\r?\n/).entries()) {
		const searchableLine = caseSensitive ? line : line.toLowerCase();
		const matchIndex = searchableLine.indexOf(query);
		if (matchIndex === -1) continue;
		if (matches.length === maxResults) {
			limitHit = true;
			break;
		}
		matches.push(formatMatch(path, index, line, matchIndex));
	}

	return formatSearchOutput(
		matches,
		`[No matches found in "${path}". File search complete.]`,
		limitHit ? '[File search incomplete: result limit reached.]' : '[File search complete.]',
	);
};

const searchWorkspace = async (path: string, input: SearchToolInput, abortSignal?: AbortSignal): Promise<string> => {
	// findTextInFiles is a proposed VS Code API and is intentionally accessed structurally so this
	// extension can still run in hosts that do not provide it.
	const findTextInFiles = (vscode.workspace as typeof vscode.workspace & { findTextInFiles?: FindTextInFiles })
		.findTextInFiles;
	if (!findTextInFiles) {
		throw new Error('Workspace text search is not available in this VS Code host.');
	}

	const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
	const matches: string[] = [];
	const seenLocations = new Set<string>();
	let resultLimitHit = false;
	const options: WorkspaceTextSearchOptions = {
		include: new vscode.RelativePattern(resolveWorkspacePath(path), '**/*'),
		maxResults,
		previewOptions: { matchLines: 1, charsPerLine: MAX_PREVIEW_CHARACTERS },
	};

	try {
		const complete = await runWorkspaceSearch(
			(token) =>
				findTextInFiles(
					{ pattern: input.query, isCaseSensitive: input.caseSensitive ?? false },
					options,
					(result) => {
						if (!isWorkspaceTextSearchMatch(result) || resultLimitHit) return;
						const ranges = Array.isArray(result.ranges) ? result.ranges : [result.ranges];
						const previewRanges = Array.isArray(result.preview.matches)
							? result.preview.matches
							: [result.preview.matches];
						const previewLines = result.preview.text.split(/\r?\n/);
						const resultPath = vscode.workspace.asRelativePath(result.uri, false).replace(/\\/g, '/');
						for (const [index, range] of ranges.entries()) {
							const location = `${resultPath}:${range.start.line}`;
							if (seenLocations.has(location)) continue;
							if (matches.length === maxResults) {
								resultLimitHit = true;
								break;
							}
							seenLocations.add(location);
							const previewRange = previewRanges[index];
							matches.push(
								formatMatch(
									resultPath,
									range.start.line,
									previewLines[previewRange?.start.line ?? 0] ?? '',
									previewRange?.start.character ?? 0,
								),
							);
						}
					},
					token,
				),
			abortSignal,
		);

		return formatSearchOutput(
			matches,
			complete.limitHit || resultLimitHit
				? '[No matches returned. Workspace search reported incomplete results.]'
				: '[No matches returned by workspace search provider; this does not prove absence.]',
			complete.limitHit || resultLimitHit
				? '[Workspace search incomplete: additional matches may exist.]'
				: '[Workspace search provider completed; results are best-effort and may be stale or incomplete.]',
		);
	} catch (error) {
		const detail = compactError(error);
		if (matches.length === 0) {
			throw new Error(`Workspace search failed: ${detail}`);
		}
		return formatSearchOutput(matches, '', `[Workspace search incomplete: ${detail}]`);
	}
};

const isWorkspaceTextSearchMatch = (
	result: WorkspaceTextSearchMatch | WorkspaceTextSearchContext,
): result is WorkspaceTextSearchMatch => 'preview' in result && 'ranges' in result;

const formatMatch = (path: string, line: number, text: string, matchCharacter: number): string => {
	const singleLine = text.replace(/\r?\n/g, ' ');
	let start = Math.max(0, matchCharacter - Math.floor(MAX_PREVIEW_CHARACTERS / 2));
	const end = Math.min(singleLine.length, start + MAX_PREVIEW_CHARACTERS);
	if (end - start < MAX_PREVIEW_CHARACTERS) {
		start = Math.max(0, end - MAX_PREVIEW_CHARACTERS);
	}
	const preview = `${start > 0 ? '…' : ''}${singleLine.slice(start, end)}${end < singleLine.length ? '…' : ''}`;
	return `${path}:${line + 1}: ${preview}`;
};

const formatSearchOutput = (matches: readonly string[], emptyMessage: string, statusMessage: string): string => {
	if (matches.length === 0) return emptyMessage;
	return formatToolOutput(matches, (includedLines) =>
		includedLines < matches.length ? OUTPUT_LIMIT_MESSAGE : statusMessage,
	);
};

const compactError = (error: unknown): string => {
	const message = errorMessage(error);
	const singleLine = message.replace(/\s+/g, ' ').trim() || 'Unknown error.';
	return singleLine.length > MAX_PREVIEW_CHARACTERS
		? `${singleLine.slice(0, MAX_PREVIEW_CHARACTERS - 1)}…`
		: singleLine;
};

const validateSearchToolInput = (value: unknown): ToolValidationResult<SearchToolInput> => {
	if (!isPlainObject(value)) {
		return invalidToolInput('search requires a non-empty string query.');
	}
	const input = value as Record<string, unknown>;
	if (!hasOnlyKeys(input, ['query', 'path', 'caseSensitive', 'maxResults'])) {
		return invalidToolInput('search accepts only query, path, caseSensitive, and maxResults.');
	}
	const query = input.query;
	if (typeof query !== 'string' || query.length === 0 || /[\r\n]/.test(query)) {
		return invalidToolInput('search query must be a non-empty single-line string.');
	}
	const path = input.path ?? undefined;
	if (path !== undefined && (typeof path !== 'string' || path.length === 0)) {
		return invalidToolInput('search path must be a non-empty string when provided.');
	}
	const caseSensitive = input.caseSensitive ?? undefined;
	if (caseSensitive !== undefined && typeof caseSensitive !== 'boolean') {
		return invalidToolInput('search caseSensitive must be a boolean when provided.');
	}
	const maxResults = input.maxResults ?? undefined;
	if (
		maxResults !== undefined &&
		(!Number.isSafeInteger(maxResults) || (maxResults as number) <= 0 || (maxResults as number) > MAX_RESULTS)
	) {
		return invalidToolInput(`search maxResults must be an integer between 1 and ${MAX_RESULTS}.`);
	}

	return {
		success: true,
		value: {
			query,
			...(path === undefined ? {} : { path: path as string }),
			...(caseSensitive === undefined ? {} : { caseSensitive }),
			...(maxResults === undefined ? {} : { maxResults: maxResults as number }),
		},
	};
};

export const createSearchTool = () =>
	tool({
		description:
			'Search workspace file contents for literal text. File searches use current contents; directory searches are best-effort, possibly stale or incomplete. Returns path:line:preview.',
		strict: false,
		inputSchema: jsonSchema<SearchToolInput>(
			{
				type: 'object',
				additionalProperties: false,
				required: ['query'],
				properties: {
					query: {
						type: 'string',
						minLength: 1,
						description: 'Single-line literal text to find.',
					},
					path: {
						type: 'string',
						minLength: 1,
						description: 'Optional workspace-relative file or directory. Defaults to the workspace root.',
					},
					caseSensitive: {
						type: 'boolean',
						default: false,
						description: 'Whether matching is case-sensitive. Defaults to false.',
					},
					maxResults: {
						type: 'integer',
						minimum: 1,
						maximum: MAX_RESULTS,
						default: DEFAULT_MAX_RESULTS,
						description: `Maximum matching lines to return. Defaults to ${DEFAULT_MAX_RESULTS}.`,
					},
				},
			},
			{ validate: validateSearchToolInput },
		),
		execute: (input, { abortSignal }) => search(input, abortSignal),
	});
