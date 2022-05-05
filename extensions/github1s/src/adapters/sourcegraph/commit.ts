/**
 * @file Sourcegraph commits api (tree/blob)
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { Commit } from '../types';
import { sourcegraphClient } from './common';

const CommitDetail = `
	oid
	author {
		person {
			name
			avatarURL
		}
		date
	}
	committer {
		person {
			email
      name
		}
	}
	message
	parents {
		oid
	}
`;

const CommitsQuery = gql`
	query($repository: String!, $ref: String!, $path: String!) {
		repository(name: $repository) {
			commit(rev: $ref) {
				${CommitDetail}
				ancestors(path: $path) {
					nodes {
						${CommitDetail}
					}
				}
			}
		}
	}
`;

const formatCommit = (commit: any) => {
	if (!commit) {
		return null;
	}
	return {
		sha: commit?.oid,
		author: commit?.author?.person?.name,
		email: commit?.committer?.person?.email,
		message: commit?.message,
		committer: commit?.commiter?.person?.name,
		createTime: new Date(commit?.author?.date),
		parents: commit?.parents?.map?.((item) => item?.oid) || [],
		avatarUrl: commit?.author?.person?.avatarURL,
	};
};

export const getCommits = async (repository: string, ref: string, path?: string): Promise<Commit[]> => {
	const response = await sourcegraphClient.query({
		query: CommitsQuery,
		variables: { repository, ref, path: path || '' },
	});
	const firstCommit = response?.data?.repository?.commit;
	const restCommits = firstCommit?.ancestors?.nodes?.map?.((item) => formatCommit(item)) || [];
	return path ? restCommits : [formatCommit(firstCommit), ...restCommits].filter(Boolean);
};

const CommitQuery = gql`
query($repository: String!, $ref: String!) {
  repository(name: $repository) {
    commit(rev: $ref) {
      ${CommitDetail}
    }
  }
}
`;

export const getCommit = async (repository: string, ref: string): Promise<Commit | null> => {
	const response = await sourcegraphClient.query({
		query: CommitQuery,
		variables: { repository, ref },
	});
	return formatCommit(response?.data?.repository?.commit);
};
