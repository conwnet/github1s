/**
 * @file VSCode GitHub1sFs Provider
 * @author netcon
 */

import {
	workspace,
	Disposable,
	FileSystemProvider,
	FileSystemError,
	Event,
	EventEmitter,
	FileChangeEvent,
	FileStat,
	FileType,
	Uri,
} from 'vscode';
import { noop, dirname, reuseable,  b64DecodeUnicode} from './util';
import { readGitHubDirectory, readGitHubFile } from './api';

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
	entries: Map<string, File | Directory>;

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
}

export type Entry = File | Directory;

export class GitHub1sFS implements FileSystemProvider, Disposable {
	static scheme = 'github1s';
	private readonly disposable: Disposable;
	private _emitter = new EventEmitter<FileChangeEvent[]>();
	private root: Directory = null;

	onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

	constructor() {
		this.disposable = Disposable.from(
			workspace.registerFileSystemProvider(GitHub1sFS.scheme, this, { isCaseSensitive: true, isReadonly: true }),
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
		let entry: Entry = this.root || (this.root = new Directory(uri.with({ path: '/' }), ''));
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

	private _lookupParentDirectory(uri: Uri): Promise<Directory> {
		const _dirname = uri.with({ path: dirname(uri.path) });
		return this._lookupAsDirectory(_dirname, false);
	}

	watch(uri: Uri, options: { recursive: boolean; excludes: string[]; }): Disposable {
		return new Disposable(noop);
	}

	stat(uri: Uri): FileStat | Thenable<FileStat> {
		return this._lookup(uri, false);
	}

	readDirectory = reuseable((uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> => {
		if (!uri.authority) {
			throw FileSystemError.FileNotFound(uri);
		}
		return this._lookupAsDirectory(uri, false).then(parent => {
			if (parent.entries !== null) {
				const res = Array.from(parent.entries.values())
					.map((item: any) => [item.name, item instanceof Directory ? FileType.Directory : FileType.File]);
				return Promise.resolve(res);
			}

			return readGitHubDirectory(uri).then(data => {
				parent.entries = new Map<string, Entry>();
				return data.tree.map((item: any) => {
					const fileType: FileType = item.type === 'tree' ? FileType.Directory : FileType.File;
					parent.entries.set(
						item.path, fileType === FileType.Directory
						? new Directory(uri, item.path, { sha: item.sha })
						: new File(uri, item.path, { sha: item.sha, size: item.size })
					);

					return [item.path, fileType];
				});
			});
		});
	}, (uri: Uri) => uri.toString());

	readFile = reuseable((uri: Uri): Uint8Array | Thenable<Uint8Array> => {
		if (!uri.authority) {
			throw FileSystemError.FileNotFound(uri);
		}
		return this._lookupAsFile(uri, false).then(file => {
			if (file.data !== null) {
				return file.data;
			}

			const encoder = new TextEncoder();
			return readGitHubFile(uri, file.sha).then(blob => {
				file.data = encoder.encode(b64DecodeUnicode(blob.content));
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
}
