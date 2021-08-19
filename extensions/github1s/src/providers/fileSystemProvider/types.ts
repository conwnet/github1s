/**
 * @file GitHub1s FileSystemProvider Types
 * @author netcon
 */

import { FileStat, FileType, Uri } from 'vscode';

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
		this.isSubmodule = options && 'isSubmodule' in options ? options.isSubmodule : false;
	}

	getNameTypePairs(): [string, FileType][] {
		return Array.from(this.entries?.entries() || []).map(([name, item]: [string, Entry]) => [
			name,
			item instanceof Directory ? FileType.Directory : FileType.File,
		]);
	}
}

export type Entry = File | Directory;

// TODO: rename
export interface GitHubRESTEntry {
	path: string;
	type: 'tree' | 'blob' | 'commit';
	sha: string;
	size?: number;
}

export interface GitHubGraphQLEntry {
	name: string;
	oid: string;
	path: string;
	type: 'tree' | 'blob' | 'commit';
	object?: any;
}
