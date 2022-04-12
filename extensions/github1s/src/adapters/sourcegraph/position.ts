/**
 * @file Sourcegraph api for searching symbol positions
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { escapeRegexp, sourcegraphClient } from './common';
import { CodeLocation } from '../types';

const searchPositionsQuery = gql`
	query($query: String!) {
		search(query: $query) {
			results {
				results {
					... on FileMatch {
						symbols {
							name
							kind
							location {
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

// get symbol position information base on search,
// used by definition, reference and hover
export const getSymbolPositions = async (repository: string, ref: string, symbol: string): Promise<CodeLocation[]> => {
	const repoRefString = ref.toUpperCase() === 'HEAD' ? `repo:${repository}` : `repo:${repository}@${ref}`;
	const optionsString = ['context:global', 'type:symbol', 'patternType:regexp', 'case:yes'].join(' ');
	const patternString = `^${escapeRegexp(symbol)}$`;
	const query = [repoRefString, optionsString, patternString].join(' ');
	const response = await sourcegraphClient.query({
		query: searchPositionsQuery,
		variables: { query },
	});

	const resultSymbols = response?.data?.search?.results?.results?.flatMap((item) => item.symbols) || [];
	return resultSymbols
		.map((symbol) => {
			const { resource, range } = symbol.location;
			// TODO: cross-repository symbols
			return {
				path: resource.path,
				range,
			};
		})
		.filter(Boolean);
};
