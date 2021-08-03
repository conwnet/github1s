/**
 * @file GitHub1s Type Definitions
 * @author netcon
 */

// prettier-ignore

declare module 'github1s' {
	type ReturnType<T> = Promise<T> | T;

	enum FileType {
		Directory = 'Directory',
		File = 'File',
		Link = 'Link',
	}

	interface DirectoryEntry {
		name: string;
		path: string;
		commit: string;
		type: FileType;
	}

	interface File {
		name: string;
		path: string;
		commit: string;
		content: Uint8Array;
	}

	interface Link {
		name: string;
		path: string;
		commit: string;
		target: string; // the path
	}

	interface Branch {
		name: string;
		commit: string;
	}

	interface Tag {
		name: string;
		commit: string;
	}

	interface Commit {
		sha: string;
		committer: string;
		author: string;
		message: string;
		createTime: string;
	}

	enum CodeReviewStatus {
		Waiting = 'Waiting', // icon: 🟢
		Approved = 'Approved', // icon: ✅
		Denied = 'Denied', // icon: ❎
		Merged = 'Merged', // icon: 🟣
		Closed = 'Closed', // icon: 🔴
	}

	interface CodeReview {
		id: number;
		status: CodeReviewStatus;
		creator: string;
		createTime: Date;
		approveTime: Date | null;
		denyTime: Date | null;
		mergeTime: Date | null;
		closeTime: Date | null;
		head: {
			label: string;
			commit: string;
		};
		base: {
			label: string;
			base: string;
		};
	}

	abstract class DataSourceProvider {
		provideDirectoryEntries(repo: string, ref: string, path: string): ReturnType<DirectoryEntry[]>;

		provideFile(repo: string, ref: string, path: string): ReturnType<File>;

		provideBranches(repo: string, offset: number, limit: number): ReturnType<Branch[]>;

		provideTags(repo: string, offset: number, limit: number): ReturnType<Tag[]>;

		provideCodeReviews(repo: string, offset: number, limit: number): ReturnType<CodeReview[]>;
	}
}
