/**
 * @file Sourcegraph file api (tree/blob)
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';

const RepositoryQuery = gql`
	query($repository: String!) {
		repository(name: $repository) {
			name
		}
	}
`;

export const getRepository = async (repository: string): Promise<{ name: string } | null> => {
	const response = await sourcegraphClient.query({
		query: RepositoryQuery,
		variables: { repository },
	});
	return response.data?.repository || null;
};
