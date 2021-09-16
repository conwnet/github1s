/**
 * @file Apollo Client
 * @author xcv58
 */

import { ApolloClient, createHttpLink, InMemoryCache, gql } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { getOAuthToken } from '@/helpers/context';

const httpLink = createHttpLink({
	uri: 'https://api.github.com/graphql',
});

const authLink = setContext((_, { headers }) => {
	const oAuthToken = getOAuthToken();
	return {
		headers: {
			...headers,
			authorization: `Bearer ${oAuthToken}`,
		},
	};
});

export const apolloClient = new ApolloClient({
	link: authLink.concat(httpLink),
	cache: new InMemoryCache(),
});
