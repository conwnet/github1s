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
	workspace,
} from 'vscode';
import adapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';
import router from '@/router';
import { noop, trimStart, basename, dirname, joinPath } from '@/helpers/util';
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
		const baseDirectory = await this.lookupAsDirectory(base.with({ path: '/' }), true);
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
	public async lookup(uri: Uri, silent: false): Promise<Entry>;
	public async lookup(uri: Uri, silent: boolean): Promise<Entry | null>;
	public async lookup(uri: Uri, silent: boolean): Promise<Entry | null> {
		const parts = uri.path.split('/').filter(Boolean);
		const { scheme, repo, ref } = router.parseUri(uri);
		const lookupKey = `${scheme}:${repo}+${ref}`;
		if (!this.root.has(lookupKey)) {
			this.root.set(lookupKey, createEntry(adapterTypes.FileType.Directory, uri.with({ path: '/' }), ''));
		}
		let entry = this.root.get(lookupKey);
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

	/**
	 * Prepares a submodule directory for loading from its own repository.
	 *
	 * Before the first read, `directory.uri` and `directory.name` locate the submodule in its parent repository.
	 * The parent URI may have an empty authority when it belongs to the current workspace. This method resolves
	 * the matching `.gitmodules` entry, then changes the directory to represent the submodule repository root:
	 * `directory.uri` receives an explicit repository and ref, and `directory.name` becomes empty. The same
	 * directory is also registered in `root` under the submodule repository key.
	 *
	 * This method does not populate `directory.entries`; `readDirectory` does that after the repository switch.
	 */
	private _updateSubmoduleDirectory = reuseable(async (directory: Directory): Promise<[string, FileType][]> => {
		// if the directory is not submodule, or it has be called already
		if (!directory.isSubmodule || directory.entries) {
			return directory.getNameTypePairs() || [];
		}
		const parentRepositoryRoot = await this.lookupAsDirectory(directory.uri.with({ path: '/' }), false);
		if (!parentRepositoryRoot?.entries || !parentRepositoryRoot.entries.has('.gitmodules')) {
			throw FileSystemError.FileNotFound('.gitmodules can not be found');
		}
		const submodulesFileContent = textDecoder.decode(
			await this.readFile(Uri.joinPath(parentRepositoryRoot.uri, '.gitmodules')),
		);
		// the path should declared in .gitmodules file
		const submodulePath = trimStart(Uri.joinPath(directory.uri, directory.name).path, '/');
		const gitmoduleData = parseGitmodules(submodulesFileContent).find((item) => item.path === submodulePath);
		if (!gitmoduleData) {
			throw FileSystemError.FileNotFound(`can't found corresponding declare in .gitmodules`);
		}
		const subRef = directory.sha || 'HEAD';
		const [subScheme, subRepo] = await parseSubmoduleUrl(gitmoduleData.url);
		const lookupKey = `${subScheme}:${subRepo}+${subRef}`;
		directory.name = ''; // update the name field to '' to indicated it is an root directory
		// update the uri field to indicated it is belong the `submodule repository`
		directory.uri = router.buildUri({ scheme: subScheme, repo: subRepo, ref: subRef, path: '/' });
		// insert the directory in to this.root map because it indicated another repository
		this.root.set(lookupKey, directory);
		return [];
	});

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
			const { scheme, repo, ref } = router.parseUri(parent.uri);
			const path = Uri.joinPath(parent.uri, parent.name).path;
			const dataSource = await adapterManager.getAdapter(scheme).resolveDataSource();
			const data = await dataSource.provideDirectory(repo, ref, path, false);
			data?.entries && (await this.populateWithDirectoryEntities(parent.uri, data.entries));
			return parent.getNameTypePairs();
		},
		(uri) => uri.toString(),
	);

	readFile = reuseable(
		async (uri: Uri): Promise<Uint8Array> => {
			// If a file belongs to the current workspace,
			// check its existence to avoid unnecessary content requests.
			// It is efficient for some built-in files like `.vscode/...`
			!uri.authority && (await this.lookupAsFile(uri, false));
			const { scheme, repo, ref, path } = router.parseUri(uri);
			const cacheKey = `${scheme}:${repo}+${ref}${path}`;
			if (!this.contentCache.has(cacheKey)) {
				const dataSource = await adapterManager.getAdapter(scheme).resolveDataSource();
				const data = await dataSource.provideFile(repo, ref, path);
				data && this.contentCache.set(cacheKey, data.content);
			}
			return this.contentCache.get(cacheKey) || new Uint8Array();
		},
		(uri) => uri.toString(),
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
