/**
 * @file Repository types
 * @author netcon
 */

export interface RepositoryRef {
	name: string;
	ref: string;
	node_id: string;
	url: string;
	object: {
		sha: string;
		type: string;
		url: string;
	};
}

export interface RepositoryPull {
	number: number;
	title: string;
	state: string;
	created_at: string;
	closed_at: string;
	merged_at: string;
	user: {
		login: string;
		avatar_url: string;
	};
	head: {
		sha: string;
	};
	base: {
		sha: string;
	};
}

export interface RepositoryCommit {
	sha: string;
	author: {
		login: string;
		avatar_url: string;
	};
	commit: {
		author: {
			date: string;
			email: string;
			name: string;
		};
		message: string;
	};
	parents: { sha: string }[];
	files?: RepositoryChangedFile[];
}

export enum FileChangeType {
	ADDED = 'added',
	REMOVED = 'removed',
	MODIFIED = 'modified',
	RENAMED = 'renamed',
}

export interface RepositoryChangedFile {
	filename: string;
	previous_filename?: string;
	status: FileChangeType;
}

export interface BlameRange {
	age: number;
	startingLine: number;
	endingLine: number;
	commit: {
		sha: string;
		message: string;
		authoredDate: string;
		author: {
			avatarUrl: string;
			name: string;
			email: string;
		};
	};
}

export interface ObjectManager<T> {
	getList(...args: any[]): T[] | Promise<T[]>;
	getItem(...args: any[]): T | Promise<T>;
	// return boolean indicate that if there are more results
	loadMore(...args: any[]): boolean | Promise<boolean>;
}

export interface PullManager extends ObjectManager<RepositoryPull> {
	getPullFiles(
		...args: any[]
	): RepositoryChangedFile[] | Promise<RepositoryChangedFile[]>;
}

export interface CommitManager extends ObjectManager<RepositoryCommit> {
	getCommitFiles(
		...args: any[]
	): RepositoryChangedFile[] | Promise<RepositoryChangedFile[]>;
	getFileCommitSha(...args: any[]);
}
