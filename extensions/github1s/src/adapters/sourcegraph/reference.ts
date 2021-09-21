/**
 * @file Sourcegraph reference api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';
import { getSymbolPositions } from './position';
import { SymbolReferences } from '../types';

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
	repository: string,
	ref: string,
	path: string,
	line: number,
	character: number
): Promise<SymbolReferences> => {
	const response = await sourcegraphClient.query({
		query: LSIFReferencesQuery,
		variables: { repository, ref, path, line, character },
	});
	const referenceNodes = response?.data?.repository?.commit?.blob?.lsif?.references?.nodes;
	// TODO: cross-repository symbols
	return (referenceNodes || []).map(({ resource, range }) => {
		return { path: resource.path, range };
	});
};

export const getSymbolReferences = (
	repository: string,
	ref: string,
	path: string,
	line: number,
	character: number,
	symbol: string
): Promise<SymbolReferences> => {
	// if failed to find references from LSIF,
	// fallback to search-based references, using
	// two promise instead of `await` to request in
	// parallel for getting result as soon as possible
	const LSIFReferencesPromise = getLSIFReferences(repository, ref, path, line, character);
	const searchReferencesPromise = getSymbolPositions(repository, ref, symbol);

	return LSIFReferencesPromise.then((LSIFReferences) => {
		if (LSIFReferences.length) {
			return LSIFReferences;
		}
		return searchReferencesPromise;
	});
};
