/**
 * @file VSCode GitHub1sFs Provider
 * @author netcon
 */

import {
	window,
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
	FileDecoration,
	ThemeColor,
	FileDecorationProvider,
} from 'vscode';
import Fuse from 'fuse.js';
import {
	noop,
	trimStart,
	parseGitmodules,
	parseSubmoduleUrl,
	reuseable,
	getCurrentAuthority,
} from './util';
import {
	readGitHubDirectory,
	readGitHubFile,
	getGithubAllFiles,
	isGraphQLEnabled,
} from './api';
import { apolloClient } from './client';
import { githubObjectQuery } from './github-api-gql';
import { toUint8Array as decodeBase64 } from 'js-base64';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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
		this.sha = options && 'sha' in options ? options.sha : '';
		this.size = options && 'size' in options ? options.size : 0;
		this.data = options && 'data' in options ? options.data : null;
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
	isSubmodule: boolean;

	constructor(public uri: Uri, name: string, options?: any) {
		this.type = FileType.Directory;
		this.ctime = Date.now();
		this.mtime = Date.now();
		this.size = 0;
		this.name = name;
		this.entries = null;
		this.sha = options && 'sha' in options ? options.sha : '';
		this.size = options && 'size' in options ? options.size : 0;
		this.isSubmodule =
			options && 'isSubmodule' in options ? options.isSubmodule : false;
	}

	getNameTypePairs(): [string, FileType][] {
		return Array.from(
			this.entries?.entries() || []
		).map(([name, item]: [string, Entry]) => [
			name,
			item instanceof Directory ? FileType.Directory : FileType.File,
		]);
	}
}

export const createEntry = (
	type: 'tree' | 'blob' | 'commit',
	uri: Uri,
	name: string,
	options?: any
) => {
	switch (type) {
		case 'tree':
			return new Directory(uri, name, options);
		case 'commit':
			return new Directory(uri, name, { ...options, isSubmodule: true });
		default:
			return new File(uri, name, options);
	}
};

interface GithubRESTEntry {
	path: string;
	type: 'tree' | 'blob' | 'commit';
	sha: string;
	size?: number;
}

interface GithubGraphQLEntry {
	name: string;
	oid: string;
	path: string;
	type: 'tree' | 'blob' | 'commit';
	object?: any;
}

export type Entry = File | Directory;

const insertGitHubRESTEntryToDirectory = (
	githubEntry: GithubRESTEntry,
	baseDirectory: Directory
) => {
	const pathParts = githubEntry.path.split('/').filter(Boolean);
	const fileName = pathParts.pop();
	let current = baseDirectory;
	pathParts.forEach((part) => {
		if (
			!(current.entries || (current.entries = new Map<string, Entry>())).has(
				part
			)
		) {
			current.entries.set(part, createEntry('tree', current.uri, current.name));
		}
		current = current.entries.get(part) as Directory;
	});
	if (
		!(current.entries || (current.entries = new Map<string, Entry>())).has(
			fileName
		)
	) {
		const entryUri = Uri.joinPath(current.uri, current.name);
		current.entries.set(
			fileName,
			createEntry(githubEntry.type, entryUri, fileName)
		);
	}
	const entry: Entry = current.entries.get(fileName);
	entry.sha = githubEntry.sha;
	entry.type === FileType.File && (entry.size = githubEntry.size!);
};

/**
 * This funtion must be used for only GraphQL output
 *
 * @param entries the entries of a GitObject
 * @param parentDirectory the parent Directory
 */
const insertGitHubGraphQLEntriesToDirectory = (
	entries: GithubGraphQLEntry[],
	parentDirectory: Directory
) => {
	if (!entries) {
		return null;
	}
	const map =
		parentDirectory.entries ||
		(parentDirectory.entries = new Map<string, Entry>());
	entries.forEach((item) => {
		const entryUri = Uri.joinPath(parentDirectory.uri, parentDirectory.name);
		const entry =
			map.get(item.name) || createEntry(item.type, entryUri, item.name);
		if (item.type === 'tree') {
			insertGitHubGraphQLEntriesToDirectory(
				item?.object?.entries,
				entry as Directory
			);
		} else if (item.type === 'blob') {
			(entry as File).size = item.object?.byteSize;
			// Set data to `null` if the blob is binary so that it will trigger the RESTful endpoint fallback.
			(entry as File).data = item.object?.isBinary
				? null
				: textEncoder.encode(item?.object?.text);
		}
		entry.sha = item.oid;
		map.set(item.name, entry);
	});
	return map;
};

export class GitHub1sFS
	implements
		FileSystemProvider,
		FileSearchProvider,
		FileDecorationProvider,
		Disposable {
	static scheme = 'github1s';
	private readonly disposable: Disposable;
	private _emitter = new EventEmitter<FileChangeEvent[]>();
	private root: Map<string, Directory | File> = new Map();
	private fuseMap: Map<string, Fuse<GithubRESTEntry>> = new Map();

	private static submoduleDecorationData: FileDecoration = {
		tooltip: 'Submodule',
		badge: 'S',
		color: new ThemeColor('gitDecoration.submoduleResourceForeground'),
	};

	onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

	constructor() {
		this.disposable = Disposable.from(
			workspace.registerFileSystemProvider(GitHub1sFS.scheme, this, {
				isCaseSensitive: true,
				isReadonly: true,
			}),
			workspace.registerFileSearchProvider(GitHub1sFS.scheme, this),
			window.registerFileDecorationProvider(this)
		);
	}
	onDidChangeFileDecorations?: Event<Uri | Uri[]>;

	dispose() {
		this.disposable?.dispose();
	}

	// --- lookup
	// ensure the authority field in `the uri of returned entry` is exists
	private async _lookup(uri: Uri, silent: false): Promise<Entry>;
	private async _lookup(uri: Uri, silent: boolean): Promise<Entry | undefined>;
	private async _lookup(uri: Uri, silent: boolean): Promise<Entry | undefined> {
		let parts = uri.path.split('/').filter(Boolean);
		// if the authority of uri is empty, we should use `current authority`
		const authority = uri.authority || (await getCurrentAuthority());
		if (!this.root.has(authority)) {
			this.root.set(
				authority,
				createEntry('tree', uri.with({ authority, path: '/' }), '')
			);
		}
		let entry = this.root.get(authority);
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

	private async _lookupAsDirectory(
		uri: Uri,
		silent: boolean
	): Promise<Directory> {
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

	watch(
		uri: Uri,
		options: { recursive: boolean; excludes: string[] }
	): Disposable {
		return new Disposable(noop);
	}

	stat(uri: Uri): FileStat | Thenable<FileStat> {
		return this._lookup(uri, false);
	}

	// update the uri of a git submodule as directory, which the type of corresponding githubEntry should be `commit`.
	// the `directory.uri.authority` and the `directory.uri.path` must belong to the `parent repository` before called.
	// and the `directory.name` is the corresponding `directory name` in `parent repository` before called.
	// once the function is called successful, the `directory.uri.authority` field, the `directory.uri.path`,
	// and the `directory.uri.name` field would be changed to the `submodule repository's`.
	//
	// so this function could be called only once for a submodule directory, for example:
	// - the directory argument before called may looks like:
	// {
	//     uri: {
	//         scheme: 'github1s',
	//         authority: 'conwnet+github1s+master', // this is the authority of `parent repository`
	//         path: '/some/submodule/path' // the corresponding path in `parent repository`
	//     },
	//     name: 'vscode', // the name is the `directory name` of `parent repository` before called
	//     entries: null, // the entries should be null to indicated we haven't call this for `parent`
	//     isSubmodule: true, // this Directory must be a submodule
	//     ...otherFields
	// }
	// - and the directory argument after called may looks like:
	// {
	//     uri: {
	//         scheme: 'github1s',
	//         authority: 'microsoft+vscode+master', // this is the authority of `submodule repository`
	//         path: '/' // the `path` filed should be '/' to indicated to the root directory of `submodule repository`
	//     },
	//     name: '', // the name is the '' to indicated it is a root directory of `submodule repository`
	//     entries: Map<string, Entry> {...}, // the entries contains the files of `submodule repository`
	//     isSubmodule: true, // this Directory must be a submodule
	//     ...otherFields
	// }
	_updateSubmoduleDirectory = reuseable(
		async (directory: Directory): Promise<[string, FileType][]> => {
			// if the directory is not submodule, or it has be called already
			if (!directory.isSubmodule || directory.entries) {
				return directory.getNameTypePairs() || [];
			}
			const parentRepositoryRoot = await this._lookupAsDirectory(
				directory.uri.with({ path: '/' }),
				false
			);
			if (
				!parentRepositoryRoot.entries ||
				!parentRepositoryRoot.entries.has('.gitmodules')
			) {
				throw FileSystemError.FileNotFound('.gitmodules can not be found');
			}
			const submodulesFileContent = textDecoder.decode(
				await this.readFile(
					Uri.joinPath(parentRepositoryRoot.uri, '.gitmodules'),
					false
				)
			);
			// the path should declared in .gitmodules file
			const submodulePath = trimStart(
				Uri.joinPath(directory.uri, directory.name).path,
				'/'
			);
			const gitmoduleData = parseGitmodules(submodulesFileContent).find(
				(item) => item.path === submodulePath
			);
			if (!gitmoduleData) {
				throw FileSystemError.FileNotFound(
					`can't found corresponding declare in .gitmodules`
				);
			}
			const [submoduleOwner, submoduleRepo] = parseSubmoduleUrl(
				gitmoduleData.url
			);
			const submoduleAuthority = `${submoduleOwner}+${submoduleRepo}+${
				directory.sha || 'HEAD'
			}`;
			directory.name = ''; // update the name field to '' to indicated it is an root directory
			// update the uri field to indicated it is belong the `submodule repository`
			directory.uri = directory.uri.with({
				authority: submoduleAuthority,
				path: '/',
			});
			// insert the directory in to this.root map because it indicated another repository
			this.root.set(submoduleAuthority, directory);
		}
	);

	readDirectory = reuseable(
		(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> => {
			return this._lookupAsDirectory(uri, false).then(async (parent) => {
				if (parent.entries !== null) {
					return parent.getNameTypePairs();
				}
				if (parent.isSubmodule) {
					await this._updateSubmoduleDirectory(parent);
				}

				const [owner, repo, ref] = parent.uri.authority.split('+');
				if (isGraphQLEnabled()) {
					return apolloClient
						.query({
							query: githubObjectQuery,
							variables: {
								owner,
								repo,
								expression: `${ref}:${Uri.joinPath(
									parent.uri,
									parent.name
								).path.slice(1)}`,
							},
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

				return readGitHubDirectory(
					owner,
					repo,
					ref,
					Uri.joinPath(parent.uri, parent.name).path
				).then((data) => {
					// create new Entry to `parent.entries` only if `parent.entries.get(item.path)` is nil
					(data.tree || []).forEach((item: GithubRESTEntry) =>
						insertGitHubRESTEntryToDirectory(item, parent)
					);
					return parent.getNameTypePairs();
				});
			});
		},
		(uri: Uri) => uri.toString()
	);

	readFile = reuseable(
		(uri: Uri): Uint8Array | Thenable<Uint8Array> => {
			return this._lookupAsFile(uri, false).then(async (file) => {
				if (file.data !== null) {
					return file.data;
				}

				/**
				 * Below code will only be triggered in two cases:
				 *   1. The GraphQL query is disabled
				 *   2. The GraphQL query is enabled, but the blob/file is binary
				 */
				const [owner, repo] = file.uri.authority.split('+');
				return readGitHubFile(owner, repo, file.sha).then((blob) => {
					file.data = decodeBase64(blob.content);
					return file.data;
				});
			});
		},
		(uri: Uri) => uri.toString()
	);

	createDirectory(uri: Uri): void | Thenable<void> {
		return Promise.resolve();
	}

	writeFile(
		uri: Uri,
		content: Uint8Array,
		options: { create: boolean; overwrite: boolean }
	): void | Thenable<void> {
		return Promise.resolve();
	}

	delete(uri: Uri, options: { recursive: boolean }): void | Thenable<void> {
		return Promise.resolve();
	}

	rename(
		oldUri: Uri,
		newUri: Uri,
		options: { overwrite: boolean }
	): void | Thenable<void> {
		return Promise.resolve();
	}

	copy?(
		source: Uri,
		destination: Uri,
		options: { overwrite: boolean }
	): void | Thenable<void> {
		return Promise.resolve();
	}

	/**
	 * getFuse for fuzzy file search,
	 * it maybe take longer time, so we just run it in backend
	 * if this is failed, the fuzzy search maybe not work fine
	 */
	getFuse = reuseable(
		async (authority): Promise<Fuse<GithubRESTEntry>> => {
			if (this.fuseMap.has(authority)) {
				return this.fuseMap.get(authority);
			}
			const [owner, repo, ref] = authority.split('+');

			return getGithubAllFiles(owner, repo, ref).then(async (treeData) => {
				if (!treeData.truncated) {
					// the number of items in the tree array maybe exceeded maximum limit
					// only update the rootDirectory if `treeData.truncated` is false

					const rootDirectory = await this._lookupAsDirectory(
						Uri.parse('').with({
							scheme: GitHub1sFS.scheme,
							authority,
							path: '/',
						}),
						false
					);
					(treeData.tree || []).forEach((githubEntry: GithubRESTEntry) => {
						insertGitHubRESTEntryToDirectory(githubEntry, rootDirectory);
					});
				}
				const fuse = new Fuse(
					((treeData.tree || []) as GithubRESTEntry[]).filter(
						(item) => item.type === 'blob'
					),
					{ keys: ['path'] }
				);
				this.fuseMap.set(authority, fuse);
				return fuse;
			});
		}
	);

	provideFileSearchResults(
		query: FileSearchQuery,
		_options: FileSearchOptions,
		_token: CancellationToken
	): ProviderResult<Uri[]> {
		return getCurrentAuthority().then(async (authority) => {
			const fuse = await this.getFuse(authority);
			return fuse.search(query.pattern).map((result) => {
				return Uri.parse('').with({
					authority,
					scheme: GitHub1sFS.scheme,
					path: `/${result.item.path}`,
				});
			});
		});
	}

	provideFileDecoration(
		uri: Uri,
		_token: CancellationToken
	): ProviderResult<FileDecoration> {
		return this._lookup(uri, false).then((entry) => {
			if (entry instanceof Directory && entry.isSubmodule === true) {
				return GitHub1sFS.submoduleDecorationData;
			}
			return null;
		});
	}
}
