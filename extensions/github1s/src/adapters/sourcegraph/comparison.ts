/**
 * @file sourcegraph comparison api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { ChangedFile, FileChangeStatus } from '../types';
import { sourcegraphClient } from './common';

const ComparisonQuery = gql`
	query($repository: String!, $base: String!, $head: String!) {
		repository(name: $repository) {
			comparison(base: $base, head: $head) {
				fileDiffs {
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
		return FileChangeStatus.Modified;
	}
	if (oldPath !== newPath) {
		return FileChangeStatus.Renamed;
	}
	return FileChangeStatus.Modified;
};

export const compareCommits = async (repository: string, base: string, head: string): Promise<ChangedFile[]> => {
	const response = await sourcegraphClient.query({
		query: ComparisonQuery,
		variables: { repository, base, head },
	});
	const diffFiles = response?.data?.repository?.comparison?.fileDiffs?.nodes || [];

	return diffFiles.map((file) => {
		const status = getFileChangeStatus(file.oldPath, file.newPath);

		return {
			status,
			path: file.newPath || file.oldPath,
			previousPath: status === FileChangeStatus.Renamed ? file.oldPath : undefined,
		};
	});
};
