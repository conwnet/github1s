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
			defaultBranch {
				displayName
			}
		}
	}
`;

export const getRepository = async (repository: string): Promise<{ name: string; defaultBranch: string } | null> => {
	const response = await sourcegraphClient.query({
		query: RepositoryQuery,
		variables: { repository },
	});
	const repositoryData = response.data?.repository;
	return repositoryData
		? { name: repositoryData.name, defaultBranch: repositoryData?.defaultBranch?.displayName }
		: null;
};
