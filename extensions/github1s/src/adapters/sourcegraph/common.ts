/**
 * @file Sourcegraph api common utils
 * @author netcon
 */

import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';
import { trimEnd, trimStart } from '@/helpers/util';

const sourcegraphLink = createHttpLink({
	// Since the Sourcegraph refused the CORS check now,
	// use Vercel Serverless Function to proxy it temporarily
	// See `/api/sourcegraph.js`
	uri: '/api/sourcegraph',
});

export const sourcegraphClient = new ApolloClient({
	link: sourcegraphLink,
	cache: new InMemoryCache(),
});

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
		new Set(globs.map((glob: string) => trimEnd(trimStart(glob, '*/'), '*/').replace(/^\./, '\\.')))
	)
		// if the glob still not can be convert to a regexp, just ignore it
		.filter((item) => canBeConvertToRegExp(item))
		.join('|');
	// ensure the result can be convert to a regexp
	return canBeConvertToRegExp(result) ? result : '';
};

export const escapeRegexp = (text: string): string => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
