/**
 * @file Sourcegraph hover api
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { SymbolHover } from '../types';
import { sourcegraphClient } from './common';

const LSIFHoverQuery = gql`
	query($repository: String!, $ref: String!, $path: String!, $line: Int!, $character: Int!) {
		repository(name: $repository) {
			commit(rev: $ref) {
				blob(path: $path) {
					lsif {
						hover(line: $line, character: $character) {
							markdown {
								text
							}
						}
					}
				}
			}
		}
	}
`;

// find Hover with Sourcegraph LSIF
// https://docs.sourcegraph.com/code_intelligence/explanations/precise_code_intelligence
const getLSIFHover = async (
	repository: string,
	ref: string,
	path: string,
	line: number,
	character: number
): Promise<SymbolHover | null> => {
	const response = await sourcegraphClient.query({
		query: LSIFHoverQuery,
		variables: {
			repository: repository,
			ref,
			path: path.slice(1),
			line,
			character,
		},
	});
	const markdown = response?.data?.repository?.commit?.blob?.lsif?.hover?.markdown?.text;

	if (!markdown) {
		return null;
	}

	return { markdown };
};

export const getSymbolHover = (
	repository: string,
	ref: string,
	path: string,
	line: number,
	character: number
): Promise<SymbolHover | null> => {
	return getLSIFHover(repository, ref, path, line, character);
};
