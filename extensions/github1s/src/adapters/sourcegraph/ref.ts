/**
 * @file Sourcegraph git ref api (branch/tag)
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';
import { Branch, Tag } from '../types';

const BranchTagQuery = gql`
	query($repository: String!) {
		repository(name: $repository) {
			branches {
				nodes {
					displayName
					target {
						commit {
							oid
						}
					}
				}
			}
			tags {
				nodes {
					displayName
					target {
						commit {
							oid
						}
					}
				}
			}
		}
	}
`;

export const getAllRefs = async (repository: string): Promise<{ branches: Branch[]; tags: Tag[] }> => {
	const response = await sourcegraphClient.query({
		query: BranchTagQuery,
		variables: { repository },
	});
	const branches = (response?.data?.repository?.branches?.nodes || []).map?.((branch) => ({
		name: branch.displayName,
		commitSha: branch.target?.commit?.oid,
	}));
	const tags = (response?.data?.repository?.tags?.nodes || []).map?.((tag) => ({
		name: tag?.displayName,
		commitSha: tag?.target?.commit?.oid,
	}));
	return { branches, tags };
};
