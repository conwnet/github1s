/**
 * @file GitHub1s Type Definitions
 * @author netcon
 */

export type Promisable<T> = PromiseLike<T> | T;

export enum FileType {
	Directory = 'Directory',
	File = 'File',
	Link = 'Link',
	Submodule = 'Submodule',
}

export type DirectoryEntry =
	| { type: FileType.Directory; path: string } // for director or link
	| { type: FileType.File; path: string; size?: number }; // for a file

export interface Directory {
	entries: DirectoryEntry[];
	// entries doesn't contains all results if `truncated` is true
	truncated: boolean;
}

export interface File {
	content: Uint8Array;
}

export interface Submodule {
	// which commit the submodule repository point to
	ref: string;
}

export interface SymbolicLink {
	path: string;
}

export interface Branch {
	name: string;
	commitSha: string;
}

export interface Tag {
	name: string;
	commitSha: string;
}

export interface Commit {
	sha: string;
	author: string;
	email: string;
	message: string;
	committer?: string;
	createTime: string;
}

export interface CodeSearchOptions {
	isCaseSensitive: boolean;
	isWordMatch: boolean;
	isRegExp: boolean;
	includes: string; // glob string
	excludes: string; // glob string
}

export interface Position {
	line: number;
	character: number;
}

export interface Range {
	start: Position;
	end: Position;
}

// for cross-repository data,
// reference to another repository
export interface ResourceScope {
	scheme: string; // github / github / bitbucket...
	repo: string;
	ref: string;
}

export interface CodeLocation {
	// we can set `scope` to marked that current
	// result is referenced to another repository
	scope?: ResourceScope;
	path: string;
	ranges: Range[];
}

export enum CodeReviewStatus {
	Opening = 'Opening', // icon: 🟢
	Merged = 'Merged', // icon: 🟣
	Closed = 'Closed', // icon: 🔴
}

// may be a Pull Request for GitHub,
// or a Merge Request for GitLab,
// or a Change Request for Gerrit
export interface CodeReview {
	id: string;
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

export interface FileBlameRange {
	age: number;
	startingLine: number;
	endingLine: number;
	commit: Commit;
}

// the string will be rendered use markdown format
export type MarkdownString = string;

export interface CommonQueryOptions {
	offset: number;
	limit: number;
	query?: string;
}

export interface DataSource {
	// if `recursive` is true, it should try to return all subtrees
	provideDirectory(repo: string, ref: string, path: string, recursive: boolean): Promisable<Directory>;

	// the ref here may be a commitSha, branch, tag, or 'HEAD'
	provideFile(repo: string, ref: string, path: string): Promisable<File>;

	provideBranches(repo: string, options: CommonQueryOptions): Promisable<Branch[]>;

	provideBranch(repo: string, branch: string): Promisable<Branch | null>;

	provideTags(repo: string, options: CommonQueryOptions): Promisable<Tag[]>;

	provideTag(repo: string, tag: string): Promisable<Tag | null>;

	provideCommits(
		repo: string,
		options: CommonQueryOptions & { from?: string; author?: string; path?: string }
	): Promisable<Commit[]>;

	// the ref here may be a commitSha, branch, tag, or 'HEAD'
	provideCommit(repo: string, ref: string): Promisable<Commit | null>;

	// use `report` to populate search results gradually
	provideTextSearchResults(
		repo: string,
		ref: string,
		query: string,
		options: CodeSearchOptions,
		report: (results: CodeLocation[]) => void
	): Promisable<{ limitHit: boolean }>;

	provideCodeReviews(
		repo: string,
		options: CommonQueryOptions & { state?: CodeReviewStatus; creator?: string }
	): Promisable<CodeReview[]>;

	provideCodeReview(repo: string, id: string): Promisable<CodeReview | null>;

	provideFileBlameRanges(repo: string, ref: string, path: string): Promisable<FileBlameRange[]>;

	provideCodeDefinition(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): Promisable<CodeLocation | CodeLocation[]>;

	provideCodeReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): Promisable<CodeLocation[]>;

	provideCodeHover(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): Promisable<MarkdownString>;

	provideUserAvatarLink(user: string): Promisable<string>;
}

export enum PageType {
	// show the structure of a dictionary
	// e.g. https://github.com/conwnet/github1s/tree/master/src/vs
	TREE = 1,

	// show the content for a file
	// e.g. https://github.com/conwnet/github1s/blob/master/extensions/github1s/src/extension.ts
	BLOB = 2,

	// show the commit list of a repository
	// e.g. https://github.com/conwnet/github1s/commits/master
	COMMIT_LIST = 3,

	// show the detail of a commit
	// e.g. https://github.com/conwnet/github1s/commit/c1264f7338833c7aa3a502c4629df8aa6b7d6ccf
	COMMIT = 4,

	// show the pull request (or merge request) list of a repository
	// e.g. https://github.com/conwnet/github1s/pulls
	CODE_REVIEW_LIST = 5,

	// show the detail of a pull request (or merge request)
	// e.g. https://github.com/conwnet/github1s/pull/81
	CODE_REVIEW = 6,

	// show the file blame
	// e.g. https://github.com/conwnet/github1s/blame/master/.gitignore
	FILE_BLAME = 7,

	// branches, tags, wiki, gist should be on the way
	UNKNOWN = 0,
}

export type RouterState = { repo: string; ref: string } & (
	| { type: PageType.TREE; filePath: string } // for tree page
	| { type: PageType.BLOB; filePath: string; startLine?: number; endLine?: number } // for blob page
	| { type: PageType.COMMIT_LIST } // for commit list page
	| { type: PageType.COMMIT; commitSha: string } // for commit detail page
	| { type: PageType.CODE_REVIEW_LIST } // for code review list page
	| { type: PageType.CODE_REVIEW; codeReviewId: string } // for code review detail page
);

export interface RouterParser {
	// parse giving path (starts with '/', may includes search and hash) to Router state,
	parsePath(path: string): Promisable<RouterState>;

	// build the tree page path
	buildTreePath(repo: string, ref: string, filePath: string): Promisable<string>;

	// build the blob page path
	// eslint-disable-next-line max-len
	buildBlobPath(repo: string, ref: string, filePath: string, startLine?: number, endLine?: number): Promisable<string>;

	// build the commit list page path
	buildCommitListPath(repo: string): Promisable<string>;

	// build the commit page path
	buildCommitPath(repo: string, commitSha: string): Promisable<string>;

	// build the code review list page path
	buildCodeReviewListPath(repo: string): Promisable<string>;

	// build the code review page path
	buildCodeReviewPath(repo: string, codeReviewId: string): Promisable<string>;

	// convert giving path to the external link (using for jumping back to origin platform)
	buildExternalLink(path: string): Promisable<string | null>;
}

export interface PlatformAdapter {
	// specify which scheme of workspace should current adapter should work with
	readonly scheme: string;
	// platform name, using for displaying text such as: `open on **GitHub**`
	readonly name: string;

	resolveDataSource(): Promisable<DataSource>;
	resolveRouterParser(): Promisable<RouterParser>;
}
