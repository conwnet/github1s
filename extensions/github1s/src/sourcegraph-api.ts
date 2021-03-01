/**
 * @file source graph api
 * @author netcon
 */

import {
	ApolloClient,
	createHttpLink,
	InMemoryCache,
	gql,
} from '@apollo/client/core';
import { TextSearchQuery, TextSearchOptions } from 'vscode';
import { trimStart, trimEnd } from './util';

const sourcegraphLink = createHttpLink({
	// Since the Sourcegraph refused the CORS check now,
	// use Vercel Serverless Function to proxy it temporarily
	// See `/api/sourcegraph.js`
	uri: '/api/sourcegraph',
});

const sourcegraphClient = new ApolloClient({
	link: sourcegraphLink,
	cache: new InMemoryCache(),
});

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

const canBeConvertToRegExp = (str: string) => {
	try {
		new RegExp(str);
		return true;
	} catch (e) {
		return false;
	}
};

const combineGlobsToRegExp = (globs: string[]) => {
	// only support very simple globs convert now
	const result = Array.from(
		new Set(
			globs.map((glob: string) =>
				trimEnd(trimStart(glob, '*/'), '*/').replace(/^\./, '\\.')
			)
		)
	)
		// if the glob still not can be convert to a regexp, just ignore it
		.filter((item) => canBeConvertToRegExp(item))
		.join('|');
	// ensure the result can be convert to a regexp
	return canBeConvertToRegExp(result) ? result : '';
};

const buildTextSearchQueryString = (
	owner: string,
	repo: string,
	ref: string,
	query: TextSearchQuery,
	options: TextSearchOptions
): string => {
	// the string may looks like `repo:conwnet/github`
	const repoString =
		ref === 'HEAD' ? `repo:${owner}/${repo}` : `repo:${owner}/${repo}@${ref}`;
	// the string may looks like `case:yse file:src -file:node_modules`
	const optionsString = [
		query.isCaseSensitive ? `case:yes` : '',
		options.includes?.length
			? `file:${combineGlobsToRegExp(options.includes)}`
			: '',
		options.excludes?.length
			? `-file:${combineGlobsToRegExp(options.excludes)}`
			: '',
	]
		.filter(Boolean)
		.join(' ');
	// convert the pattern to adapt the sourcegraph API
	let pattenString = query.pattern;
	const escapeRegexp = (text: string): string =>
		text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

	if (!query.isRegExp && !query.isWordMatch) {
		pattenString = `"${pattenString}"`;
	} else if (!query.isRegExp && query.isWordMatch) {
		pattenString = `/\\b${escapeRegexp(pattenString)}\\b/`;
	} else if (query.isRegExp && !query.isWordMatch) {
		pattenString = `/${pattenString}/`;
	} else if (query.isRegExp && query.isWordMatch) {
		return `/\b${pattenString}\b/`;
	}

	return [repoString, optionsString, pattenString].filter(Boolean).join(' ');
};

export const getTextSearchResults = (
	owner: string,
	repo: string,
	ref: string,
	query: TextSearchQuery,
	options: TextSearchOptions
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
