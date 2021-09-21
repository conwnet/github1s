/**
 * @file Sourcegraph definition api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';
import { getSymbolPositions } from './position';
import { SymbolDefinitions } from '../types';

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
	repository: string,
	ref: string,
	path: string,
	line: number,
	character: number
): Promise<SymbolDefinitions> => {
	const response = await sourcegraphClient.query({
		query: LSIFDefinitionsQuery,
		variables: { repository, ref, path, line, character },
	});
	const definitionNodes = response?.data?.repository?.commit?.blob?.lsif?.definitions?.nodes;
	// TODO: cross-repository symbols
	return (definitionNodes || []).map(({ resource, range }) => {
		return { path: resource.path, range };
	});
};

export const getSymbolDefinitions = (
	repository: string,
	ref: string,
	path: string,
	line: number,
	character: number,
	symbol: string
): Promise<SymbolDefinitions> => {
	// if failed to find definitions from LSIF,
	// fallback to search-based definitions, using
	// two promise instead of `await` to request in
	// parallel for getting result as soon as possible
	const LSIFDefinitionsPromise = getLSIFDefinitions(repository, ref, path, line, character);
	const searchDefinitionsPromise = getSymbolPositions(repository, ref, symbol);

	return LSIFDefinitionsPromise.then((LSIFResults) => {
		if (LSIFResults.length) {
			return LSIFResults;
		}
		return searchDefinitionsPromise;
	});
};
