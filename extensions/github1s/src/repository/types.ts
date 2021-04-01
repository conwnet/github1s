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
