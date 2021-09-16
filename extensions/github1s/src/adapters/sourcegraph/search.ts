/**
 * @file Sourcegraph search api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { CodeSearchOptions } from '../types';
import { escapeRegexp, sourcegraphClient, combineGlobsToRegExp, getRepoRefQueryString } from './common';

export const buildTextSearchQueryString = (
	owner: string,
	repo: string,
	ref: string,
	query: string,
	options: CodeSearchOptions
): string => {
	const repoRefQueryString = getRepoRefQueryString(owner, repo, ref);
	// the string may looks like `case:yse file:src -file:node_modules`
	const optionsString = [
		options.isCaseSensitive ? `case:yes` : '',
		options.includes?.length ? `file:${combineGlobsToRegExp(options.includes)}` : '',
		options.excludes?.length ? `-file:${combineGlobsToRegExp(options.excludes)}` : '',
	]
		.filter(Boolean)
		.join(' ');
	// convert the pattern to adapt the sourcegraph API
	let patternString = query;

	if (!options.isRegExp && !options.isWordMatch) {
		patternString = `"${patternString}"`;
	} else if (!options.isRegExp && options.isWordMatch) {
		patternString = `/\\b${escapeRegexp(patternString)}\\b/`;
	} else if (options.isRegExp && !options.isWordMatch) {
		patternString = `/${patternString}/`;
	} else if (options.isRegExp && options.isWordMatch) {
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

export const getTextSearchResults = (
	owner: string,
	repo: string,
	ref: string,
	query: string,
	options: CodeSearchOptions
): any => {
	return sourcegraphClient
		.query({
			query: textSearchQuery,
			variables: {
				query: buildTextSearchQueryString(owner, repo, ref, query, options),
			},
		})
		.then((response) => response?.data?.search?.results);
};
