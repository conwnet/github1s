/**
 * @file Sourcegraph commits api (tree/blob)
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { Commit } from '../types';
import { querySourcegraphRepository } from './common';

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

const getGitHubUserAvatarUrl = (username) => {
	if (username.includes(' ')) {
		return `https://github.com/github.png`;
	}
	return `https://github.com/${username.slice(-5) === '[bot]' ? username.slice(0, -5) : username}.png`;
};

const formatCommit = (commit: any, isGitHub: boolean) => {
	if (!commit) {
		return null;
	}
	const authorName = commit?.author?.person?.name;
	return {
		sha: commit?.oid,
		author: authorName,
		email: commit?.committer?.person?.email,
		message: commit?.message,
		committer: commit?.commiter?.person?.name,
		createTime: new Date(commit?.author?.date),
		parents: commit?.parents?.map?.((item) => item?.oid) || [],
		avatarUrl: commit?.author?.person?.avatarURL || (isGitHub ? getGitHubUserAvatarUrl(authorName) : ''),
	};
};

export const getCommits = async (repository: string, ref: string, path?: string): Promise<Commit[]> => {
	const repositoryData = await querySourcegraphRepository({
		query: CommitsQuery,
		variables: { repository, ref, path: path || '' },
	});

	const firstCommit = repositoryData.commit;
	const isGitHub = repository.startsWith('github.com/');
	const restCommits = firstCommit?.ancestors?.nodes?.map?.((item) => formatCommit(item, isGitHub)) || [];
	return path ? restCommits : [formatCommit(firstCommit, isGitHub), ...restCommits].filter(Boolean);
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
	const repositoryData = await querySourcegraphRepository({
		query: CommitQuery,
		variables: { repository, ref },
	});
	const isGitHub = repository.startsWith('github.com/');
	return formatCommit(repositoryData.commit, isGitHub);
};
