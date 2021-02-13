/**
 * @file Apollo Client
 * @author xcv58
 */

import { ApolloClient, createHttpLink, InMemoryCache, gql } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { getOAuthToken } from './util';

const httpLink = createHttpLink({
	uri: 'https://api.github.com/graphql',
});

const authLink = setContext((_, { headers }) => {
	const oAuthToken = getOAuthToken();
	return {
		headers: {
			...headers,
			authorization: `Bearer ${oAuthToken}`
		}
	};
});

export const githubObjectQuery = gql`
fragment TreeEntryFields on TreeEntry {
  oid
  name
  path
  type
}

fragment BlobFields on Blob {
  oid
  byteSize
  text
  isBinary
}

fragment TreeField on Tree {
  id
  entries {
    ...TreeEntryFields
    object {
      ...BlobFields
    }
  }
}

query objectQuery($owner: String!, $repo: String!, $expression: String!) {
  repository(name: $repo, owner: $owner) {
    id
    object(expression: $expression) {
      ...TreeField
    }
  }
}
`;

export const apolloClient = new ApolloClient({
	link: authLink.concat(httpLink),
	cache: new InMemoryCache()
});
