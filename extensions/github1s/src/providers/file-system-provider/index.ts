/**
 * @file GitHub1s FileSystemProvider
 * @author netcon
 */

import {
	Disposable,
	Event,
	EventEmitter,
	FileSystemProvider,
	FileSystemError,
	FileChangeEvent,
	FileStat,
	FileType,
	Uri,
} from 'vscode';
import adapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';
import router from '@/router';
import { noop, trimStart, basename, dirname } from '@/helpers/util';
import { parseGitmodules, parseSubmoduleUrl } from '@/helpers/submodule';
import { reuseable } from '@/helpers/func';
import { File, Directory, Entry } from './types';

const textDecoder = new TextDecoder();

const createEntry = (type: adapterTypes.FileType, uri: Uri, name: string, options?: any) => {
	switch (type) {
		case adapterTypes.FileType.Directory:
			return new Directory(uri, name, options);
		case adapterTypes.FileType.Submodule:
			return new Directory(uri, name, { ...options, isSubmodule: true });
		default:
			return new File(uri, name, options);
	}
};

export class GitHub1sFileSystemProvider implements FileSystemProvider, Disposable {
	private static instance: GitHub1sFileSystemProvider | null = null;
	private readonly disposable: Disposable;
	private _emitter = new EventEmitter<FileChangeEvent[]>();
	private root: Map<string, Directory | File> = new Map();
	private contentCache: Map<string, Uint8Array> = new Map();

	private constructor() {}

	public static getInstance(): GitHub1sFileSystemProvider {
		if (GitHub1sFileSystemProvider.instance) {
			return GitHub1sFileSystemProvider.instance;
		}
		return (GitHub1sFileSystemProvider.instance = new GitHub1sFileSystemProvider());
	}

	onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

	dispose() {
		this.disposable?.dispose();
	}

	private async _resolveDataSource(scheme: string) {
		return adapterManager.getAdapter(scheme).resolveDataSource();
	}

	// insert DirectoryEntry into the cache `this.root`
	public async populateWithDirectoryEntities(base: Uri, entries: adapterTypes.DirectoryEntry[]) {
		const baseDirectory = await this.lookupAsDirectory(base, true);
		if (!baseDirectory) {
			return;
		}
		return entries.forEach((entry) => {
			let current = baseDirectory;
			const pathParts = dirname(entry.path).split('/').filter(Boolean);
			pathParts.forEach((part) => {
				if (!(current.entries || (current.entries = new Map<string, Entry>())).has(part)) {
					current.entries.set(part, createEntry(adapterTypes.FileType.Directory, current.uri, current.name));
				}
				current = current.entries.get(part) as Directory;
			});
			const fileName = basename(entry.path);
			if (!(current.entries || (current.entries = new Map<string, Entry>())).has(fileName)) {
				const entryUri = Uri.joinPath(current.uri, current.name);
				current.entries.set(fileName, createEntry(entry.type, entryUri, fileName));
			}
		});
	}

	// --- lookup
	// ensure the authority field in `the uri of returned entry` is exists
	public async lookup(uri: Uri, silent: false): Promise<Entry>;
	public async lookup(uri: Uri, silent: boolean): Promise<Entry | null>;
	public async lookup(uri: Uri, silent: boolean): Promise<Entry | null> {
		let parts = uri.path.split('/').filter(Boolean);
		// if the authority of uri is empty, we should use `current authority`
		const authority = uri.authority || (await router.getAuthority());
		if (!this.root.has(authority)) {
			this.root.set(authority, createEntry(adapterTypes.FileType.Directory, uri.with({ authority, path: '/' }), ''));
		}
		let entry = this.root.get(authority);
		for (const part of parts) {
			let child: Entry | undefined;
			if (entry instanceof Directory) {
				if (entry.entries === null) {
					await this.readDirectory(Uri.joinPath(entry.uri, entry.name));
				}
				child = entry.entries?.get(part);
			}
			if (!child) {
				if (!silent) {
					throw FileSystemError.FileNotFound(uri);
				} else {
					return null;
				}
			}
			entry = child;
		}
		return entry || null;
	}

	public async lookupAsDirectory(uri: Uri, silent: boolean): Promise<Directory | null> {
		const entry = await this.lookup(uri, silent);
		if (entry instanceof Directory) {
			return entry;
		}
		if (!silent) {
			throw FileSystemError.FileNotADirectory(uri);
		}
		return null;
	}

	public async lookupAsFile(uri: Uri, silent: boolean): Promise<File | null> {
		const entry = await this.lookup(uri, silent);
		if (entry instanceof File) {
			return entry;
		}
		if (!silent) {
			throw FileSystemError.FileIsADirectory(uri);
		}
		return null;
	}

	watch(uri: Uri, options: { recursive: boolean; excludes: string[] }): Disposable {
		return new Disposable(noop);
	}

	stat(uri: Uri): FileStat | Thenable<FileStat> {
		return this.lookup(uri, false);
	}

	// it used by `@/src/providers/fileDecorationProvider.ts`
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
	private _updateSubmoduleDirectory = reuseable(
		async (directory: Directory): Promise<[string, FileType][]> => {
			// if the directory is not submodule, or it has be called already
			if (!directory.isSubmodule || directory.entries) {
				return directory.getNameTypePairs() || [];
			}
			const parentRepositoryRoot = await this.lookupAsDirectory(directory.uri.with({ path: '/' }), false);
			if (!parentRepositoryRoot?.entries || !parentRepositoryRoot.entries.has('.gitmodules')) {
				throw FileSystemError.FileNotFound('.gitmodules can not be found');
			}
			const submodulesFileContent = textDecoder.decode(
				await this.readFile(Uri.joinPath(parentRepositoryRoot.uri, '.gitmodules'))
			);
			// the path should declared in .gitmodules file
			const submodulePath = trimStart(Uri.joinPath(directory.uri, directory.name).path, '/');
			const gitmoduleData = parseGitmodules(submodulesFileContent).find((item) => item.path === submodulePath);
			if (!gitmoduleData) {
				throw FileSystemError.FileNotFound(`can't found corresponding declare in .gitmodules`);
			}
			const [submoduleOwner, submoduleRepo] = parseSubmoduleUrl(gitmoduleData.url);
			const submoduleAuthority = `${submoduleOwner}+${submoduleRepo}+${directory.sha || 'HEAD'}`;
			directory.name = ''; // update the name field to '' to indicated it is an root directory
			// update the uri field to indicated it is belong the `submodule repository`
			directory.uri = directory.uri.with({
				authority: submoduleAuthority,
				path: '/',
			});
			// insert the directory in to this.root map because it indicated another repository
			this.root.set(submoduleAuthority, directory);
			return [];
		}
	);

	readDirectory = reuseable(
		async (uri: Uri): Promise<[string, FileType][]> => {
			const parent = await this.lookupAsDirectory(uri, false);
			if (!parent) {
				return [];
			}

			if (parent.entries !== null) {
				return parent.getNameTypePairs();
			}
			if (parent.isSubmodule) {
				await this._updateSubmoduleDirectory(parent);
			}
			const [repo, ref] = parent.uri.authority.split('+');
			const path = Uri.joinPath(parent.uri, parent.name).path.slice(1); // delete leading '/'
			const dataSource = await this._resolveDataSource(uri.scheme);
			const data = await dataSource.provideDirectory(repo, ref, path, false);
			data?.entries && (await this.populateWithDirectoryEntities(uri, data.entries));
			return parent.getNameTypePairs();
		},
		(uri) => uri.toString()
	);

	readFile = reuseable(
		async (uri: Uri): Promise<Uint8Array> => {
			const authority = uri.authority || (await router.getAuthority());
			const cacheKey = `${uri.scheme} ${authority} ${uri.path}`;

			if (!this.contentCache.has(cacheKey)) {
				const [repo, ref] = authority.split('+');
				const dataSource = await this._resolveDataSource(uri.scheme);
				const data = await dataSource.provideFile(repo, ref, uri.path.slice(1));
				data && this.contentCache.set(cacheKey, data.content);
			}
			return this.contentCache.get(cacheKey) || new Uint8Array();
		},
		(uri) => uri.toString()
	);

	async createDirectory(uri: Uri): Promise<void> {
		return;
	}

	async writeFile(uri: Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): Promise<void> {
		return;
	}

	async delete(uri: Uri, options: { recursive: boolean }): Promise<void> {
		return;
	}

	async rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): Promise<void> {
		return;
	}

	async copy?(source: Uri, destination: Uri, options: { overwrite: boolean }): Promise<void> {
		return;
	}
}
