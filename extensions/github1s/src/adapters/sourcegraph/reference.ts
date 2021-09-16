/**
 * @file Sourcegraph reference api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';
import { getSymbolPositions } from './position';

export interface SymbolReference {
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

const LSIFReferencesQuery = gql`
	query($repository: String!, $ref: String!, $path: String!, $line: Int!, $character: Int!) {
		repository(name: $repository) {
			commit(rev: $ref) {
				blob(path: $path) {
					lsif {
						references(line: $line, character: $character) {
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

// find references with Sourcegraph LSIF
// https://docs.sourcegraph.com/code_intelligence/explanations/precise_code_intelligence
const getLSIFReferences = async (
	owner: string,
	repo: string,
	ref: string,
	path: string,
	line: number,
	character: number
): Promise<SymbolReference[]> => {
	const response = await sourcegraphClient.query({
		query: LSIFReferencesQuery,
		variables: {
			repository: `github.com/${owner}/${repo}`,
			ref,
			path: path.slice(1),
			line,
			character,
		},
	});
	const referenceNodes = response?.data?.repository?.commit?.blob?.lsif?.references?.nodes;
	return (referenceNodes || []).map(({ resource, range }) => {
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

export const getSymbolReferences = (
	owner: string,
	repo: string,
	ref: string,
	path: string,
	line: number,
	character: number,
	symbol: string
): Promise<SymbolReference[]> => {
	// if failed to find references from LSIF,
	// fallback to search-based references, using
	// two promise instead of `await` to request in
	// parallel for getting result as soon as possible
	const LSIFReferencesPromise = getLSIFReferences(owner, repo, ref, path, line, character);
	const searchReferencesPromise = getSymbolPositions(owner, repo, ref, symbol);

	return LSIFReferencesPromise.then((LSIFReferences) => {
		if (LSIFReferences.length) {
			return LSIFReferences;
		}
		return searchReferencesPromise as Promise<SymbolReference[]>;
	});
};
