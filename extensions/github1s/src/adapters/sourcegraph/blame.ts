/**
 * @file sourcegraph blame api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { BlameRange } from '../types';
import { querySourcegraphRepository } from './common';

const BlameRangesQuery = gql`
	query ($repository: String!, $ref: String!, $path: String!) {
		repository(name: $repository) {
			commit(rev: $ref) {
				blob(path: $path) {
					blame(startLine: 1, endLine: 99999) {
						startLine
						endLine
						commit {
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
						}
					}
				}
			}
		}
	}
`;

const computeBlameRangeAge = (time: number, oldestTime: number, newestTime: number) => {
	const blockWidth = (newestTime - oldestTime) / 10;
	return 10 - Math.floor((time - oldestTime) / blockWidth);
};

export const getFileBlameRanges = async (repository: string, ref: string, path: string): Promise<BlameRange[]> => {
	const repositoryData = await querySourcegraphRepository({
		query: BlameRangesQuery,
		variables: { repository, ref, path },
	});

	const blames = repositoryData.commit?.blob?.blame || [];
	const commitTimes = blames.map((blame) => new Date(blame?.commit?.author?.date).getTime()).sort();
	const oldestTime = commitTimes[0];
	const newestTime = commitTimes[commitTimes.length - 1];
	return blames.map((blame) => ({
		age: computeBlameRangeAge(new Date(blame.commit?.author?.date).getTime(), oldestTime, newestTime),
		startingLine: blame.startLine,
		endingLine: blame.endLine - 1,
		commit: {
			sha: blame.commit?.oid,
			author: blame.commit?.author?.person?.name,
			email: blame.commit?.committer?.person?.email,
			message: blame.commit?.message,
			committer: blame.commit?.commiter?.person?.name,
			createTime: new Date(blame.commit?.author?.date),
			avatarUrl: blame.commit?.author?.person?.avatarURL,
		},
	}));
};
