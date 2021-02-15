/**
 * @file VSCode GitHub1sFs Provider
 * @author netcon
 */

import {
	workspace,
	Disposable,
	FileSystemProvider,
	FileSearchProvider,
	FileSearchQuery,
	FileSearchOptions,
	CancellationToken,
	ProviderResult,
	FileSystemError,
	Event,
	EventEmitter,
	FileChangeEvent,
	FileStat,
	FileType,
	Uri,
} from 'vscode';
import Fuse from 'fuse.js';
import { noop, reuseable, getCurrentAuthority } from './util';
import { readGitHubDirectory, readGitHubFile, getGithubAllFiles, isGraphQLEnabled } from './api';
import { apolloClient } from './client';
import { githubObjectQuery } from './github-api-gql';
import { toUint8Array as decodeBase64 } from 'js-base64';

const textEncoder = new TextEncoder();

export class File implements FileStat {
	type: FileType;
	ctime: number;
	mtime: number;
	size: number;
	name: string;
	sha: string;
	data?: Uint8Array;

	constructor(public uri: Uri, name: string, options?: any) {
		this.type = FileType.File;
		this.ctime = Date.now();
		this.mtime = Date.now();
		this.name = name;
		this.sha = (options && ('sha' in options)) ? options.sha : '';
		this.size = (options && ('size' in options)) ? options.size : 0;
		this.data = (options && ('data' in options)) ? options.data : null;
	}
}

export class Directory implements FileStat {
	type: FileType;
	ctime: number;
	mtime: number;
	size: number;
	sha: string;
	name: string;
	entries: Map<string, File | Directory> | null;

	constructor(public uri: Uri, name: string, options?: any) {
		this.type = FileType.Directory;
		this.ctime = Date.now();
		this.mtime = Date.now();
		this.size = 0;
		this.name = name;
		this.entries = null;
		this.sha = (options && ('sha' in options)) ? options.sha : '';
		this.size = (options && ('size' in options)) ? options.size : 0;
	}

	getNameTypePairs(): [string, FileType][] {
		return Array.from(this.entries?.values() || [])
			.map((item: Entry) => [item.name, item instanceof Directory ? FileType.Directory : FileType.File]);
	}
}

interface GithubRESTEntry {
	path: string;
	type: 'tree' | 'blob';
	sha: string;
	size?: number;
}

interface GithubGraphQLEntry {
	name: string;
	oid: string;
	path: string;
	type: string;
	object?: any;
}

export type Entry = File | Directory;

const insertGitHubRESTEntryToDirectory = (githubEntry: GithubRESTEntry, baseDirectory: Directory) => {
	const pathParts = githubEntry.path.split('/').filter(Boolean);
	const fileName = pathParts.pop();
	let current = baseDirectory;
	pathParts.forEach(part => {
		if (!(current.entries || (current.entries = new Map<string, Entry>())).get(part)) {
			current.entries.set(part, new Directory(Uri.joinPath(current.uri, current.name), part));
		}
		current = current.entries.get(part) as Directory;
	});
	if (!(current.entries || (current.entries = new Map<string, Entry>())).get(fileName)) {
		const entryUri = Uri.joinPath(current.uri, current.name);
		current.entries.set(fileName, (githubEntry.type === 'tree') ? new Directory(entryUri, fileName) : new File(entryUri, fileName));
	}
	const entry: Entry = current.entries.get(fileName);
	entry.sha = githubEntry.sha;
	(entry.type === FileType.File) && (entry.size = githubEntry.size!);
};

/**
 * This funtion must be used for only GraphQL output
 *
 * @param entries the entries of a GitObject
 * @param parentDirectory the parent Directory
 */
const insertGitHubGraphQLEntriesToDirectory = (entries: GithubGraphQLEntry[], parentDirectory: Directory) => {
	if (!entries) {
		return null;
	}
	const map = (parentDirectory.entries || (parentDirectory.entries = new Map<string, Entry>()));
	entries.forEach((item) => {
		const entryUri = Uri.joinPath(parentDirectory.uri, parentDirectory.name);
		const isDirectory = item.type === 'tree';
		let entry;
		if (isDirectory) {
			entry = (map.get(item.name) || new Directory(entryUri, item.name));
			insertGitHubGraphQLEntriesToDirectory(item?.object?.entries, entry);
		} else {
			entry = (map.get(item.name) || new File(entryUri, item.name));
			entry.size = item.object?.byteSize;
			// Set data to `null` if the blob is binary so that it will trigger the RESTful endpoint fallback.
			entry.data = item.object?.isBinary ? null : textEncoder.encode(item?.object?.text);
		}
		entry.sha = item.oid;
		map.set(item.name, entry);
	});
	return map;
};

export class GitHub1sFS implements FileSystemProvider, FileSearchProvider, Disposable {
	static scheme = 'github1s';
	private readonly disposable: Disposable;
	private _emitter = new EventEmitter<FileChangeEvent[]>();
	private root: Map<string, Directory | File> = new Map();
	private fuseMap: Map<string, Fuse<GithubRESTEntry>> = new Map();

	onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

	constructor() {
		this.disposable = Disposable.from(
			workspace.registerFileSystemProvider(GitHub1sFS.scheme, this, { isCaseSensitive: true, isReadonly: true }),
			workspace.registerFileSearchProvider(GitHub1sFS.scheme, this),
		);
	}

	dispose() {
		this.disposable?.dispose();
	}

	// --- lookup
	private async _lookup(uri: Uri, silent: false): Promise<Entry>;
	private async _lookup(uri: Uri, silent: boolean): Promise<Entry | undefined>;
	private async _lookup(uri: Uri, silent: boolean): Promise<Entry | undefined> {
		let parts = uri.path.split('/').filter(Boolean);
		let currentAuthority = await getCurrentAuthority();
		if (!this.root.get(currentAuthority)) {
			this.root.set(currentAuthority, new Directory(uri.with({ path: '/' }), ''));
		}
		let entry = this.root.get(currentAuthority);
		for (const part of parts) {
			let child: Entry | undefined;
			if (entry instanceof Directory) {
				if (entry.entries === null) {
					await this.readDirectory(Uri.joinPath(entry.uri, entry.name));
				}
				child = entry.entries.get(part);
			}
			if (!child) {
				if (!silent) {
					throw FileSystemError.FileNotFound(uri);
				} else {
					return undefined;
				}
			}
			entry = child;
		}
		return entry;
	}

	private async _lookupAsDirectory(uri: Uri, silent: boolean): Promise<Directory> {
		const entry = await this._lookup(uri, silent);
		if (entry instanceof Directory) {
			return entry;
		}
		if (!silent) {
			throw FileSystemError.FileNotADirectory(uri);
		}
	}

	private async _lookupAsFile(uri: Uri, silent: boolean): Promise<File> {
		const entry = await this._lookup(uri, silent);
		if (entry instanceof File) {
			return entry;
		}
		if (!silent) {
			throw FileSystemError.FileIsADirectory(uri);
		}
	}

	watch(uri: Uri, options: { recursive: boolean; excludes: string[]; }): Disposable {
		return new Disposable(noop);
	}

	stat(uri: Uri): FileStat | Thenable<FileStat> {
		return this._lookup(uri, false);
	}

	readDirectory = reuseable((uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> => {
		return this._lookupAsDirectory(uri, false).then(async parent => {
			if (parent.entries !== null) {
				return parent.getNameTypePairs();
			}

			const [owner, repo, ref] = (uri.authority || await getCurrentAuthority()).split('+');
			if (isGraphQLEnabled()) {
					return apolloClient.query({
						query: githubObjectQuery, variables: {
							owner,
							repo,
							expression: `${ref}:${uri.path.slice(1)}`
						}
					})
						.then((response) => {
							const entries = response.data?.repository?.object?.entries;
							if (!entries) {
								throw FileSystemError.FileNotADirectory(uri);
							}
							insertGitHubGraphQLEntriesToDirectory(entries, parent);
							return parent.getNameTypePairs();
						});
			}

			return readGitHubDirectory(owner, repo, ref, uri.path).then(data => {
				// create new Entry to `parent.entries` only if `parent.entries.get(item.path)` is nil
				(data.tree || []).forEach((item: GithubRESTEntry) => insertGitHubRESTEntryToDirectory(item, parent));
				return parent.getNameTypePairs();
			});
		});
	}, (uri: Uri) => uri.toString());

	readFile = reuseable((uri: Uri): Uint8Array | Thenable<Uint8Array> => {
		return this._lookupAsFile(uri, false).then(async file => {
			if (file.data !== null) {
				return file.data;
			}

			/**
			 * Below code will only be triggered in two cases:
			 *   1. The GraphQL query is disabled
			 *   2. The GraphQL query is enabled, but the blob/file is binary
			 */
			const [owner, repo] = (uri.authority || await getCurrentAuthority()).split('+');
			return readGitHubFile(owner, repo, file.sha).then(blob => {
				file.data = decodeBase64(blob.content);
				return file.data;
			});
		});
	}, (uri: Uri) => uri.toString());

	createDirectory(uri: Uri): void | Thenable<void> {
		return Promise.resolve();
	}

	writeFile(uri: Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
		return Promise.resolve();
	}

	delete(uri: Uri, options: { recursive: boolean; }): void | Thenable<void> {
		return Promise.resolve();
	}

	rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		return Promise.resolve();
	}

	copy?(source: Uri, destination: Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		return Promise.resolve();
	}

	/**
	 * getFuse for fuzzy file search,
	 * it maybe take longer time, so we just run it in backend
	 * if this is failed, the fuzzy search maybe not work fine
	 */
	getFuse = reuseable(async (authority): Promise<Fuse<GithubRESTEntry>> => {
		if (this.fuseMap.has(authority)) {
			return this.fuseMap.get(authority);
		}
		const [owner, repo, ref] = authority.split('+');

		return getGithubAllFiles(owner, repo, ref).then(async treeData => {
			if (!treeData.truncated) {
				// the number of items in the tree array maybe exceeded maximum limit
				// only update the rootDirectory if `treeData.truncated` is false

				const rootDirectory = await this._lookupAsDirectory(Uri.parse('').with({ scheme: GitHub1sFS.scheme, authority, path: '/' }), false);
				(treeData.tree || []).forEach((githubEntry: GithubRESTEntry) => {
					insertGitHubRESTEntryToDirectory(githubEntry, rootDirectory);
				});
			}
			const fuse = new Fuse(((treeData.tree || []) as GithubRESTEntry[]).filter(item => (item.type === 'blob')), { keys: ['path'] });
			this.fuseMap.set(authority, fuse);
			return fuse;
		});
	});

	provideFileSearchResults(query: FileSearchQuery, _options: FileSearchOptions, _token: CancellationToken): ProviderResult<Uri[]> {
		return getCurrentAuthority().then((authority) => this.getFuse(authority))
		.then((fuse: Fuse<GithubRESTEntry>) => fuse.search(query.pattern).map((result) => {
				return Uri.parse('').with({ scheme: GitHub1sFS.scheme, path: result.item.path });
			})
		);
	}
}
