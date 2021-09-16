/**
 * @file GitHub GraphQL API
 * @author xcv58
 */

import { gql } from '@apollo/client/core';
import { apolloClient } from './client';
import { hasValidToken } from '@/helpers/context';

// TODO: GraphQL API is experimental now, we need more test.
// It maybe crash or slow when there are too many files in one directory.
// For example the repository `git/git`, the TTFB cost about 3 seconds,
// and the response body size exceed 7MB before zip
export const ENABLE_GRAPHQL: boolean = false;

export const isGraphQLEnabled = () => {
	return hasValidToken() && ENABLE_GRAPHQL;
};

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
			refs(refPrefix: "refs/heads/", first: 100) {
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
				repo,
			},
		})
		.then((response) => response.data?.repository?.refs?.nodes?.map((x) => x.name));
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

/**
 * GraphQL to get git blame data of a file
 */
export const githubFileBlameQuery = gql`
	query fileBlameQuery($owner: String!, $repo: String!, $ref: String!, $path: String!) {
		repository(owner: $owner, name: $repo) {
			object(expression: $ref) {
				... on Commit {
					blame(path: $path) {
						ranges {
							age
							startingLine
							endingLine
							commit {
								sha: oid
								message
								authoredDate
								author {
									avatarUrl
									name
									email
								}
							}
						}
					}
				}
			}
		}
	}
`;
