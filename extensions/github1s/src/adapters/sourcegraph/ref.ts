/**
 * @file Sourcegraph git ref api (branch/tag)
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { querySourcegraphRepository } from './common';
import { Branch, Tag } from '../types';

const BranchTagQuery = gql`
	query ($repository: String!) {
		repository(name: $repository) {
			branches {
				nodes {
					displayName
					target {
						commit {
							oid
							author {
								date
							}
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
							author {
								date
							}
						}
					}
				}
			}
		}
	}
`;

export const getAllRefs = async (repository: string): Promise<{ branches: Branch[]; tags: Tag[] }> => {
	const repositoryData = await querySourcegraphRepository({
		query: BranchTagQuery,
		variables: { repository },
	});

	const sortByTimeDesc = (branchA, branchB) => {
		return branchA.target?.commit?.author?.date > branchB.target?.commit?.author?.date ? -1 : 1;
	};
	const branches = (repositoryData.branches?.nodes || [])
		?.filter(Boolean)
		?.sort(sortByTimeDesc)
		?.map?.((branch) => ({
			name: branch.displayName,
			commitSha: branch.target?.commit?.oid,
			description: `Branch at ${branch.target?.commit?.oid?.slice(0, 8)}`,
		}));
	const tags = (repositoryData.tags?.nodes || [])
		?.filter(Boolean)
		?.sort(sortByTimeDesc)
		?.map?.((tag) => ({
			name: tag?.displayName,
			commitSha: tag?.target?.commit?.oid,
			description: `Tag at ${tag?.target?.commit?.oid?.slice(0, 8)}`,
		}));
	return { branches, tags };
};
