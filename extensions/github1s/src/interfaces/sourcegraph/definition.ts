/**
 * @file Sourcegraph definition api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';
import { getSymbolPositions } from './position';

export interface SymbolDefinition {
	precise: boolean;
	owner: string;
	repo: string;
	ref: string;
	path: string;
	range: {
		start: {
			line: number;
			character: number;
		};
		end: {
			line: number;
			character: number;
		};
	};
}

const LSIFDefinitionsQuery = gql`
	query($repository: String!, $ref: String!, $path: String!, $line: Int!, $character: Int!) {
		repository(name: $repository) {
			commit(rev: $ref) {
				blob(path: $path) {
					lsif {
						definitions(line: $line, character: $character) {
							nodes {
								resource {
									path
									repository {
										name
									}
									commit {
										oid
									}
								}
								range {
									start {
										line
										character
									}
									end {
										line
										character
									}
								}
							}
						}
					}
				}
			}
		}
	}
`;

// find definitions with Sourcegraph LSIF
// https://docs.sourcegraph.com/code_intelligence/explanations/precise_code_intelligence
const getLSIFDefinitions = async (
	owner: string,
	repo: string,
	ref: string,
	path: string,
	line: number,
	character: number
): Promise<SymbolDefinition[]> => {
	const response = await sourcegraphClient.query({
		query: LSIFDefinitionsQuery,
		variables: {
			repository: `github.com/${owner}/${repo}`,
			ref,
			path: path.slice(1),
			line,
			character,
		},
	});
	const definitionNodes = response?.data?.repository?.commit?.blob?.lsif?.definitions?.nodes;
	return (definitionNodes || []).map(({ resource, range }) => {
		const [owner, repo] = resource.repository.name.split('/').filter(Boolean).slice(-2);
		return {
			precise: true,
			owner,
			repo,
			ref: resource.commit.oid,
			path: `/${resource.path}`,
			range,
		};
	});
};

export const getSymbolDefinitions = (
	owner: string,
	repo: string,
	ref: string,
	path: string,
	line: number,
	character: number,
	symbol: string
): Promise<SymbolDefinition[]> => {
	// if failed to find definitions from LSIF,
	// fallback to search-based definitions, using
	// two promise instead of `await` to request in
	// parallel for getting result as soon as possible
	const LSIFDefinitionsPromise = getLSIFDefinitions(owner, repo, ref, path, line, character);
	const searchDefinitionsPromise = getSymbolPositions(owner, repo, ref, symbol);

	return LSIFDefinitionsPromise.then((LSIFDefinitions) => {
		if (LSIFDefinitions.length) {
			return LSIFDefinitions;
		}
		return searchDefinitionsPromise as Promise<SymbolDefinition[]>;
	});
};
