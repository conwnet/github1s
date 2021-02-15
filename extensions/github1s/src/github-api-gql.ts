/**
 * @file GitHub GraphQL API
 * @author xcv58
 */

import { gql } from '@apollo/client/core';
import { apolloClient } from './client';

/**
 * Query to get first 100 branch name
 */
export const refsQuery = gql`
query refsQuery($owner: String!, $repo: String!) {
  repository(name: $repo, owner: $owner) {
    id
    defaultBranchRef {
      name
      prefix
    }
    refs(refPrefix: "refs/heads/" first: 100) {
      totalCount
      nodes {
        name
      }
    }
  }
}
`;

export const getBranches = (owner: string, repo: string) => {
	return apolloClient
	.query({
		query: refsQuery,
		variables: {
			owner,
			repo
		}
	}).then((response) => response.data?.repository?.refs?.nodes?.map(x => x.name));
};

/**
 * GraphQL to get GitObject which contains directory/file information
 */
export const githubObjectQuery = gql`
fragment TreeEntryFields on TreeEntry {
  oid
  name
  path
  type
}

fragment BlobFields on Blob {
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
