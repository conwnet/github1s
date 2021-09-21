/**
 * @file Sourcegraph search api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { TextSearchOptions, CommonQueryOptions, TextSearchQuery, TextSearchResults } from '../types';
import { escapeRegexp, sourcegraphClient, combineGlobsToRegExp, getRepoRefQueryString } from './common';

// build text search query for sourcegraph graphql request
export const buildTextSearchQueryString = (
	repo: string,
	ref: string,
	query: TextSearchQuery,
	options: TextSearchOptions
): string => {
	const repoRefQueryString = ref.toUpperCase() === 'HEAD' ? `repo:${repo}` : `repo:${repo}@${ref}`;
	// the string may looks like `case:yse file:src -file:node_modules`
	const optionsString = [
		query.isCaseSensitive ? `case:yes` : '',
		options.includes?.length ? `file:${combineGlobsToRegExp(options.includes)}` : '',
		options.excludes?.length ? `-file:${combineGlobsToRegExp(options.excludes)}` : '',
	]
		.filter(Boolean)
		.join(' ');
	// convert the pattern to adapt the sourcegraph API
	let patternString = query.pattern;

	if (!query.isRegExp && !query.isWordMatch) {
		patternString = `"${patternString}"`;
	} else if (!query.isRegExp && query.isWordMatch) {
		patternString = `/\\b${escapeRegexp(patternString)}\\b/`;
	} else if (query.isRegExp && !query.isWordMatch) {
		patternString = `/${patternString}/`;
	} else if (query.isRegExp && query.isWordMatch) {
		return `/\b${patternString}\b/`;
	}

	return [repoRefQueryString, optionsString, patternString].filter(Boolean).join(' ');
};

const textSearchQuery = gql`
	query($query: String!) {
		search(query: $query) {
			results {
				__typename
				limitHit
				matchCount
				approximateResultCount
				missing {
					name
				}
				cloning {
					name
				}
				timedout {
					name
				}
				indexUnavailable
				results {
					... on FileMatch {
						__typename
						file {
							name
							path
						}
						lineMatches {
							preview
							lineNumber
							offsetAndLengths
						}
					}
				}
			}
		}
	}
`;

const formatTextSearchResults = (searchResults) => {
	const truncated = searchResults.limitHit;
	const results = searchResults.results.flatMap((fileMatch) => {
		const path = fileMatch.file.path;

		return fileMatch.lineMatches.map((lineMatch) => {
			const lineNumber = lineMatch.lineNumber;
			const ranges = lineMatch.offsetAndLengths.map((segment) => ({
				start: { line: lineNumber, character: segment[0] },
				end: { line: lineNumber, character: segment[0] + segment[1] },
			}));
			const previewMatches = lineMatch.offsetAndLengths.map((segment) => ({
				start: { line: 0, character: segment[0] },
				end: { line: 0, character: segment[0] + segment[1] },
			}));
			const preview = { text: lineMatch.preview, matches: previewMatches };

			return { path, ranges, preview };
		});
	});

	return { results, truncated };
};

export const getTextSearchResults = (
	repository: string,
	ref: string,
	query: TextSearchQuery,
	options: TextSearchOptions
): Promise<TextSearchResults> => {
	return sourcegraphClient
		.query({
			query: textSearchQuery,
			variables: { query: buildTextSearchQueryString(repository, ref, query, options) },
		})
		.then((response) => formatTextSearchResults(response?.data?.search?.results));
};
