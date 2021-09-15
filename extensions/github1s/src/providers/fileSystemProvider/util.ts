/**
 * @file GitHub1s FileSystemProvider Util
 * @author netcon
 */

import { Uri, FileType } from 'vscode';
import { File, Directory, Entry, GitHubRESTEntry, GitHubGraphQLEntry } from './types';

const textEncoder = new TextEncoder();

export const createEntry = (type: 'tree' | 'blob' | 'commit', uri: Uri, name: string, options?: any) => {
	switch (type) {
		case 'tree':
			return new Directory(uri, name, options);
		case 'commit':
			return new Directory(uri, name, { ...options, isSubmodule: true });
		default:
			return new File(uri, name, options);
	}
};

export const insertGitHubRESTEntryToDirectory = (githubEntry: GitHubRESTEntry, baseDirectory: Directory) => {
	const pathParts = githubEntry.path.split('/').filter(Boolean);
	const fileName = pathParts.pop();
	let current = baseDirectory;
	pathParts.forEach((part) => {
		if (!(current.entries || (current.entries = new Map<string, Entry>())).has(part)) {
			current.entries.set(part, createEntry('tree', current.uri, current.name));
		}
		current = current.entries.get(part) as Directory;
	});
	if (!(current.entries || (current.entries = new Map<string, Entry>())).has(fileName)) {
		const entryUri = Uri.joinPath(current.uri, current.name);
		current.entries.set(fileName, createEntry(githubEntry.type, entryUri, fileName));
	}
	const entry: Entry = current.entries.get(fileName);
	entry.sha = githubEntry.sha;
	entry.type === FileType.File && (entry.size = githubEntry.size!);
};

/**
 * This function must be used for only GraphQL output
 *
 * @param entries the entries of a GitObject
 * @param parentDirectory the parent Directory
 */
export const insertGitHubGraphQLEntriesToDirectory = (entries: GitHubGraphQLEntry[], parentDirectory: Directory) => {
	if (!entries) {
		return null;
	}
	const map = parentDirectory.entries || (parentDirectory.entries = new Map<string, Entry>());
	entries.forEach((item) => {
		const entryUri = Uri.joinPath(parentDirectory.uri, parentDirectory.name);
		const entry = map.get(item.name) || createEntry(item.type, entryUri, item.name);
		if (item.type === 'tree') {
			insertGitHubGraphQLEntriesToDirectory(item?.object?.entries, entry as Directory);
		} else if (item.type === 'blob') {
			(entry as File).size = item.object?.byteSize;
			// Set data to `null` if the blob is binary so that it will trigger the RESTful endpoint fallback.
			(entry as File).data = item.object?.isBinary ? null : textEncoder.encode(item?.object?.text);
		}
		entry.sha = item.oid;
		map.set(item.name, entry);
	});
	return map;
};
