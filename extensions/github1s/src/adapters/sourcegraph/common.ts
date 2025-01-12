/**
 * @file Sourcegraph api common utils
 * @author netcon
 */

import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import { isNil, trimEnd, trimStart } from '@/helpers/util';

const createFetchWithTimeout = (timeout: number): typeof fetch => {
	return (uri, opts) => {
		const ctrl = new AbortController();
		const timeoutId = setTimeout(() => ctrl.abort(), timeout);
		return fetch(uri, { ...opts, signal: ctrl.signal }).finally(() => {
			clearTimeout(timeoutId);
		});
	};
};

const sourcegraphLink = createHttpLink({
	uri: 'https://sourcegraph.com/.api/graphql',
	fetch: createFetchWithTimeout(3000),
});

export const sourcegraphClient = new ApolloClient({
	link: sourcegraphLink,
	cache: new InMemoryCache(),
});

export const querySourcegraphRepository = async (
	...args: Parameters<typeof sourcegraphClient.query>
): Promise<Record<string, any>> => {
	const response = await sourcegraphClient.query(...args);
	if (isNil((response.data as any).repository)) {
		const error = new Error('repository is not found');
		(error as any).repositoryNotFound = true;
		throw error;
	}
	return (response.data as any).repository;
};

export const canBeConvertToRegExp = (str: string) => {
	try {
		new RegExp(str);
		return true;
	} catch (e) {
		return false;
	}
};

export const combineGlobsToRegExp = (globs: string[]) => {
	// only support very simple globs convert now
	const result = Array.from(
		new Set(globs.map((glob: string) => trimEnd(trimStart(glob, '*/'), '*/').replace(/^\./, '\\.'))),
	)
		// if the glob still not can be convert to a regexp, just ignore it
		.filter((item) => canBeConvertToRegExp(item))
		.join('|');
	// ensure the result can be convert to a regexp
	return canBeConvertToRegExp(result) ? result : '';
};

export const escapeRegexp = (text: string): string => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export const buildRepoPattern = (repo: string) => {
	return `^${escapeRegexp(repo)}$`;
};
