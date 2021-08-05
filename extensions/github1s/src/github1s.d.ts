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

	interface FileEntry {
		path: string;
		commitSha: string;
		type: FileType;
	}

	interface Directory {
		path: string;
		entries: FileEntry[];
		// entries doesn't contains all results if `truncated` is true
		truncated: boolean;
	}

	interface File {
		path: string;
		commitSha: string;
		content: Uint8Array;
	}

	interface Link {
		path: string;
		commitSha: string;
		target: string; // the path
	}

	interface Branch {
		name: string;
		commitSha: string;
	}

	interface Tag {
		name: string;
		commitSha: string;
	}

	interface Commit {
		sha: string;
		author: string;
		email: string;
		message: string;
		committer?: string;
		createTime: string;
	}

	interface CodeSearchOptions {
		isCaseSensitive: boolean;
		isWordMatch: boolean;
		isRegExp: boolean;
		includes: string; // glob string
		excludes: string; // glob string
	}

	interface Position {
		line: number;
		character: number
	}

	interface Range {
		start: Position;
		end: Position;
	}

	// for cross-repository data,
	// reference to another repository
	interface ResourceScope {
		schema: string; // github / github / bitbucket...
		repo: string;
		ref: string
	}

	interface TextSearchResult {
		files: {
			// we can set `scope` to marked that current
			// result is referenced to another repository
			scope?: ResourceScope
			path: string;
			ranges: Range[];
		}[],
		truncated: boolean;
	}

	enum CodeReviewStatus {
		Waiting = 'Waiting', // icon: 🟢
		Approved = 'Approved', // icon: ✅
		Denied = 'Denied', // icon: ❎
		Merged = 'Merged', // icon: 🟣
		Closed = 'Closed', // icon: 🔴
	}

	// may be a Pull Request for GitHub,
	// or a Merge Request for GitLab,
	// or a Change Request for Gerrit
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
			commitSha: string;
		};
		base: {
			label: string;
			commitSha: string;
		};
	}

	interface FileBlameRange {
		age: number;
		startingLine: number;
		endingLine: number;
		commit: Commit;
	}

	abstract class DataSourceProvider {
		// if `recursive` is true, it should try to return all subtrees
		provideDirectory(repo: string, ref: string, path: string, recursive: boolean): ReturnType<Directory[]>;

		// the ref here may be a commitSha, branch, tag, or 'HEAD'
		provideFile(repo: string, ref: string, path: string): ReturnType<File>;

		provideBranches(repo: string, offset: number, limit: number): ReturnType<Branch[]>;

		provideBranch(repo: string, branch: string): ReturnType<Branch | null>;

		provideTags(repo: string, offset: number, limit: number): ReturnType<Tag[]>;

		provideTag(repo: string, tag: string): ReturnType<Tag | null>;

		provideCommits(repo: string, offset: number, limit: number): ReturnType<Commit[]>;

		// the commit history of a file
		provideFileCommits(repo: string, path: string, offset: number, limit: number): ReturnType<Commit[]>;

		// the ref here may be a commitSha, branch, tag, or 'HEAD'
		provideCommit(repo: string, ref: string): ReturnType<Commit | null>;

		// use `report` to populate search results gradually
		provideTextSearchResults(repo: string, ref: string, query: string, options: CodeSearchOptions, report: (results: TextSearchResult) => void): ReturnType<{ limitHit: boolean }>;

		provideCodeReviews(repo: string, offset: number, limit: number): ReturnType<CodeReview[]>;

		provideCodeReview(repo: string, id: number): ReturnType<CodeReview | null>;

		provideFileBlameRanges(repo: string, ref: string, path: string): ReturnType<FileBlameRange[]>;
	}
}
