/**
 * @file Sourcegraph file api (tree/blob)
 * @author netcon
 */

import { gql } from '@apollo/client/core';
import { sourcegraphClient } from './common';
import { File, Directory, FileType } from '../types';

const DirectoryQuery = gql`
	query($repository: String!, $ref: String!, $path: String!, $recursive: Boolean = false) {
		repository(name: $repository) {
			commit(rev: $ref) {
				tree(path: $path) {
					entries(recursive: $recursive, recursiveSingleChild: false) {
						path
						isDirectory
						# TODO submodule don't work now
						submodule {
							commit
						}
					}
				}
			}
		}
	}
`;

export const readDirectory = async (
	repository: string,
	ref: string,
	path: string,
	recursive = false
): Promise<Directory> => {
	const response = await sourcegraphClient.query({
		query: DirectoryQuery,
		variables: { repository, ref, path, recursive },
	});
	const files = (await response?.data?.repository?.commit?.tree?.entries) || [];
	const pathParts = path.split('/').filter(Boolean);
	return {
		entries: files.map((file) => ({
			path: file.path.split('/').filter(Boolean).slice(pathParts.length).join('/'),
			type: file.isDirectory ? FileType.Directory : file.submodule ? FileType.Submodule : FileType.File,
			commitSha: file.submodule?.sha,
		})),
		truncated: false,
	};
};

const FileQuery = gql`
	query($repository: String!, $ref: String!, $path: String!) {
		repository(name: $repository) {
			commit(rev: $ref) {
				blob(path: $path) {
					content
					binary
				}
			}
		}
	}
`;

export const readFile = async (
	repository: string,
	ref: string,
	path: string,
	recursive = false
): Promise<{ content: string; binary: boolean }> => {
	const response = await sourcegraphClient.query({
		query: FileQuery,
		variables: { repository, ref, path, recursive },
	});
	const blob = await response?.data?.repository?.commit?.blob;
	return { content: blob?.content || '', binary: blob?.binary || false };
};
