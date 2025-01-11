/**
 * @file Sourcegraph file api (tree/blob)
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';

const RepositoryQuery = gql`
	query ($repository: String!) {
		repository(name: $repository) {
			name
			isPrivate
			defaultBranch {
				displayName
			}
		}
	}
`;

export const getRepository = async (
	repository: string,
): Promise<{ private: boolean; defaultBranch: string } | null> => {
	const response = await sourcegraphClient.query({
		query: RepositoryQuery,
		variables: { repository },
	});
	const repositoryData = response.data?.repository;
	return repositoryData
		? { private: repositoryData.isPrivate, defaultBranch: repositoryData.defaultBranch?.displayName }
		: null;
};
