/**
 * @file searchcode and GitHub REST code search fallbacks
 */

import type { Octokit } from '@octokit/core';
import { minimatch } from 'minimatch';
import type { Range, TextSearchOptions, TextSearchQuery, TextSearchResults } from '../types';

const createSearchPathFilter = (options: TextSearchOptions) => {
	const folder = (options.path || '').split('/').filter(Boolean).join('/');
	const matchesGlob = (path: string, glob: string) =>
		minimatch(path, glob, { dot: true, nonegate: true, nocomment: true });
	return (path: string): boolean => {
		path = path.replace(/^\/+/, '');
		if (folder && !path.startsWith(`${folder}/`)) return false;
		const relativePath = folder ? path.slice(folder.length + 1) : path;
		return (
			(!options.includes?.length || options.includes.some((glob) => matchesGlob(relativePath, glob))) &&
			!options.excludes?.some((glob) => matchesGlob(relativePath, glob))
		);
	};
};

const createSearchMatcher = (query: TextSearchQuery): RegExp => {
	const pattern = query.isRegExp ? query.pattern : query.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(query.isWordMatch ? `\\b(?:${pattern})\\b` : pattern, query.isCaseSensitive ? 'g' : 'gi');
};

// Returns an addLine function that reports false only when an extra match exceeds the limit.
const createLineMatchCollector = (result: TextSearchResults, matcher: RegExp, maxResults = 1000) => {
	let matchCount = 0;
	return (path: string, line: number, text: string): boolean => {
		const ranges: Range[] = [];
		let limitHit = false;
		for (const match of text.matchAll(matcher)) {
			if (matchCount >= maxResults) {
				result.truncated = true;
				limitHit = true;
				break;
			}
			ranges.push({
				start: { line, character: match.index },
				end: { line, character: match.index + match[0].length },
			});
			matchCount++;
		}
		if (ranges.length) {
			result.results.push({
				path: `/${path.replace(/^\/+/, '')}`,
				ranges,
				preview: {
					text,
					matches: ranges.map(({ start, end }) => ({
						start: { line: 0, character: start.character },
						end: { line: 0, character: end.character },
					})),
				},
			});
		}
		return !limitHit;
	};
};

export const getGitHubTextSearchResults = async (
	request: Octokit['request'],
	baseUrl: string,
	repoFullName: string,
	query: TextSearchQuery,
	options: TextSearchOptions = {},
): Promise<TextSearchResults> => {
	const result: TextSearchResults = { results: [], truncated: false };
	if (!query.pattern || options.maxResults === 0) {
		return result;
	}
	if (query.isRegExp || query.isMultiline || /[\r\n]/.test(query.pattern)) {
		throw new Error('GitHub Code Search API does not support regular expressions or multiline queries.');
	}

	const acceptsPath = createSearchPathFilter(options);
	const addLine = createLineMatchCollector(result, createSearchMatcher(query), options.maxResults);
	const { data } = await request('GET /search/code', {
		baseUrl,
		q: `${JSON.stringify(query.pattern)} in:file repo:${repoFullName}`,
		page: 1,
		per_page: 100,
		headers: { accept: 'application/vnd.github.text-match+json' },
	});
	result.truncated = data.incomplete_results || data.total_count > data.items.length;
	const items = data.items.filter(({ path }) => acceptsPath(path));

	// Search snippets come from the default branch. Their lines only approximate file locations.
	for (const { path, text_matches } of items) {
		const fragments = new Set<string>();
		for (const match of text_matches || []) {
			if (match.property === 'content' && match.fragment) {
				fragments.add(match.fragment);
			}
		}
		if (!fragments.size) {
			result.truncated = true;
			continue;
		}
		// Keep distinct snippets on separate lines so the editor does not merge unrelated matches.
		const lines = [...fragments].join('\n').split(/\r\n|\n|\r/);
		for (let line = 0; line < lines.length; line++) {
			if (!addLine(path, line, lines[line])) return result;
		}
	}
	return result;
};

interface SearchcodeResults {
	total_matches: number;
	has_more: boolean;
	truncated: boolean;
	results:
		| {
				file: string;
				matches_in_file: number;
				matches: { line: number; content: string }[];
		  }[]
		| null;
}

export const getSearchcodeTextSearchResults = async (
	repository: string,
	query: TextSearchQuery,
	options: TextSearchOptions = {},
): Promise<TextSearchResults> => {
	const result: TextSearchResults = { results: [], truncated: false };
	if (!query.pattern || options.maxResults === 0) {
		return result;
	}
	if (query.isMultiline || /[\r\n]/.test(query.pattern)) {
		throw new Error('Searchcode API does not support multiline queries.');
	}

	const matcher = createSearchMatcher(query);
	const acceptsPath = createSearchPathFilter(options);
	const addLine = createLineMatchCollector(result, matcher, options.maxResults);
	// Quoting literals prevents search operators such as OR and path: from changing their meaning.
	const searchQuery =
		query.isRegExp || query.isWordMatch
			? `/${matcher.source.replace(/\\\//g, '\\x2f')}/`
			: JSON.stringify(query.pattern);
	const controller = new AbortController();
	// Bound the request before trying the next backend.
	const timeout = setTimeout(() => controller.abort(), 10000);
	try {
		const response = await fetch('https://api.searchcode.com/api/v1/code_search?client=github1s', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'omit',
			signal: controller.signal,
			body: JSON.stringify({
				repository,
				query: searchQuery,
				case_sensitive: !!query.isCaseSensitive,
				snippet_mode: 'grep',
				context_lines: 1,
				include_all_dirs: true,
				max_results: 100,
				max_matches_per_file: 50,
				offset: 0,
			}),
		});
		if (!response.ok) {
			throw new Error(`Searchcode API request failed (${response.status}).`);
		}
		const data: SearchcodeResults = await response.json();
		if (
			!data ||
			typeof data.total_matches !== 'number' ||
			typeof data.has_more !== 'boolean' ||
			typeof data.truncated !== 'boolean' ||
			(!Array.isArray(data.results) && !(data.results === null && data.total_matches === 0))
		) {
			throw new Error('Searchcode API returned an invalid search response.');
		}
		result.truncated = data.truncated || data.has_more;
		const files = data.results || [];
		for (const file of files) {
			if (
				!file ||
				typeof file.file !== 'string' ||
				!Array.isArray(file.matches) ||
				typeof file.matches_in_file !== 'number'
			) {
				throw new Error('Searchcode API returned an invalid file match.');
			}
			if (!acceptsPath(file.file)) continue;
			result.truncated ||= file.matches_in_file > file.matches.length;
			const seenLines = new Set<number>();
			for (const snippet of file.matches) {
				if (!snippet || !Number.isInteger(snippet.line) || snippet.line < 1 || typeof snippet.content !== 'string') {
					throw new Error('Searchcode API returned an invalid line match.');
				}
				if (seenLines.has(snippet.line)) continue;
				seenLines.add(snippet.line);
				if (!addLine(file.file, snippet.line - 1, snippet.content)) return result;
			}
		}
		return result;
	} finally {
		clearTimeout(timeout);
	}
};
