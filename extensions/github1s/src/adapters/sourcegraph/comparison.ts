/**
 * @file sourcegraph comparison api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { ChangedFile, FileChangeStatus } from '../types';
import { querySourcegraphRepository } from './common';

const ComparisonQuery = gql`
	query ($repository: String!, $base: String!, $head: String!, $first: Int) {
		repository(name: $repository) {
			comparison(base: $base, head: $head) {
				fileDiffs(first: $first) {
					nodes {
						newPath
						oldPath
					}
				}
			}
		}
	}
`;

const getFileChangeStatus = (oldPath: string | null, newPath: string | null): FileChangeStatus => {
	if (!oldPath) {
		return FileChangeStatus.Added;
	}
	if (!newPath) {
		return FileChangeStatus.Removed;
	}
	if (oldPath !== newPath) {
		return FileChangeStatus.Renamed;
	}
	return FileChangeStatus.Modified;
};

export const compareCommits = async (
	repository: string,
	base: string,
	head: string,
	limit?: number,
): Promise<ChangedFile[]> => {
	const repositoryData = await querySourcegraphRepository({
		query: ComparisonQuery,
		variables: { repository, base, head, first: limit },
	});
	const diffFiles = repositoryData.comparison?.fileDiffs?.nodes || [];

	return diffFiles
		.filter((file) => file.oldPath || file.newPath)
		.map((file) => {
			const status = getFileChangeStatus(file.oldPath, file.newPath);

			return {
				status,
				path: file.newPath || file.oldPath,
				previousPath: status === FileChangeStatus.Renamed ? file.oldPath : undefined,
			};
		});
};
