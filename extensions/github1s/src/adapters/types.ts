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

export interface CommonQueryOptions {
	page: number;
	pageSize: number;
	query?: string;
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
	creator: string; // website login user
	author: string; // original commit author
	email: string;
	message: string;
	committer?: string;
	createTime: Date;
	parents?: Commit[];
	avatarUrl: string;
}

export interface TextSearchQuery {
	pattern: string;
	isMultiline?: boolean;
	isRegExp?: boolean;
	isCaseSensitive?: boolean;
	isWordMatch?: boolean;
}

export interface TextSearchOptions {
	page: number;
	pageSize: number;
	includes: string[]; // glob string
	excludes: string[]; // glob string
}

export interface TextSearchResults {
	results: {
		scope?: ResourceScope;
		path: string;
		ranges: Range | Range[];
		preview: {
			text: string;
			matches: Range | Range[];
		};
	}[];
	truncated: boolean;
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

export enum CodeReviewState {
	Open = 'Open', // icon: 🟢
	Merged = 'Merged', // icon: 🟣
	Closed = 'Closed', // icon: 🔴
}

// may be a Pull Request for GitHub,
// or a Merge Request for GitLab,
// or a Change Request for Gerrit
export interface CodeReview {
	id: string;
	title: string;
	state: CodeReviewState;
	creator: string;
	createTime: Date;
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
	avatarUrl: string;
}

export enum FileChangeStatus {
	Added = 'added',
	Removed = 'removed',
	Modified = 'modified',
	Renamed = 'renamed',
}

export interface ChangedFile {
	scope?: ResourceScope;
	status: FileChangeStatus;
	path: string;
	// changed file may be renamed
	previousPath?: string;
}

export interface BlameRange {
	age: number;
	startingLine: number;
	endingLine: number;
	commit: Commit;
}

export interface CodeLocation {
	// we can set `scope` to marked that current
	// result is referenced to another repository
	scope?: ResourceScope;
	path: string;
	range: Range;
}

export type SymbolDefinitions = CodeLocation[];

export type SymbolReferences = CodeLocation[];

export type SymbolHover = { markdown: string };

export class DataSource {
	// if `recursive` is true, it should try to return all subtrees
	provideDirectory(repo: string, ref: string, path: string, recursive: boolean): Promisable<Directory | null> {
		return null;
	}

	// the ref here may be a commitSha, branch, tag, or 'HEAD'
	provideFile(repo: string, ref: string, path: string): Promisable<File | null> {
		return null;
	}

	provideBranches(repo: string, options: CommonQueryOptions): Promisable<Branch[]> {
		return [];
	}

	provideBranch(repo: string, branchName: string): Promisable<Branch | null> {
		return null;
	}

	provideTags(repo: string, options: CommonQueryOptions): Promisable<Tag[]> {
		return [];
	}

	provideTag(repo: string, tagName: string): Promisable<Tag | null> {
		return null;
	}

	// use `report` to populate search results gradually
	provideTextSearchResults(
		repo: string,
		ref: string,
		query: TextSearchQuery,
		options: TextSearchOptions
	): Promisable<TextSearchResults> {
		return { results: [], truncated: false };
	}

	// optionally return changed files (if `files` exists can reduce api calls)
	// should return by the order of `new to old`
	provideCommits(
		repo: string,
		options: CommonQueryOptions & { from?: string; author?: string; path?: string }
	): Promisable<(Commit & { files?: ChangedFile[] })[]> {
		return [];
	}

	// the ref here may be a commitSha, branch, tag, or 'HEAD'
	// optionally return changed files (if `files` exists can reduce api calls)
	provideCommit(repo: string, ref: string): Promisable<(Commit & { files?: ChangedFile[] }) | null> {
		return null;
	}

	provideCommitChangedFiles(repo: string, ref: string, options: CommonQueryOptions): Promisable<ChangedFile[]> {
		return [];
	}

	// optionally return changed files (if `files` exists can reduce api calls)
	provideCodeReviews(
		repo: string,
		options: CommonQueryOptions & { state?: CodeReviewState; creator?: string }
	): Promisable<(CodeReview & { files?: ChangedFile[] })[]> {
		return [];
	}

	// optionally return changed files (if `files` exists can reduce api calls)
	provideCodeReview(repo: string, id: string): Promisable<(CodeReview & { files?: ChangedFile[] }) | null> {
		return null;
	}

	provideCodeReviewChangedFiles(repo: string, id: string, options: CommonQueryOptions): Promisable<ChangedFile[]> {
		return [];
	}

	provideFileBlameRanges(repo: string, ref: string, path: string): Promisable<BlameRange[]> {
		return [];
	}

	provideSymbolDefinitions(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string
	): Promisable<SymbolDefinitions> {
		return [];
	}

	provideSymbolReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string
	): Promisable<SymbolReferences> {
		return [];
	}

	provideSymbolHover(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string
	): Promisable<SymbolHover | null> {
		return null;
	}

	provideUserAvatarLink(user: string): string {
		return '';
	}
}

export enum PageType {
	// show the structure of a dictionary
	// e.g. https://github.com/conwnet/github1s/tree/master/src/vs
	Tree = 'Tree',

	// show the content for a file
	// e.g. https://github.com/conwnet/github1s/blob/master/extensions/github1s/src/extension.ts
	Blob = 'Blob',

	// show the commit list of a repository
	// e.g. https://github.com/conwnet/github1s/commits/master
	CommitList = 'CommitList',

	// show the detail of a commit
	// e.g. https://github.com/conwnet/github1s/commit/c1264f7338833c7aa3a502c4629df8aa6b7d6ccf
	Commit = 'Commit',

	// show the pull request (or merge request) list of a repository
	// e.g. https://github.com/conwnet/github1s/pulls
	CodeReviewList = 'CodeReviewList',

	// show the detail of a pull request (or merge request)
	// e.g. https://github.com/conwnet/github1s/pull/81
	CodeReview = 'CodeReview',

	// show the file blame
	// e.g. https://github.com/conwnet/github1s/blame/master/.gitignore
	FileBlame = 'FileBlame',

	// branches, tags, wiki, gist should be on the way
	Unknown = 'Unknown',
}

export type RouterState = { repo: string; ref: string } & (
	| { pageType: PageType.Tree; filePath: string } // for tree page
	| { pageType: PageType.Blob; filePath: string; startLine?: number; endLine?: number } // for blob page
	| { pageType: PageType.CommitList } // for commit list page
	| { pageType: PageType.Commit; commitSha: string } // for commit detail page
	| { pageType: PageType.CodeReviewList } // for code review list page
	| { pageType: PageType.CodeReview; codeReviewId: string } // for code review detail page
);

export class RouterParser {
	// parse giving path (starts with '/', may includes search and hash) to Router state,
	parsePath(path: string): Promisable<RouterState> {
		return { repo: 'conwnet/github1s', ref: 'HEAD', pageType: PageType.Tree, filePath: '' };
	}

	// build the tree page path
	buildTreePath(repo: string, ref?: string, filePath?: string): Promisable<string> {
		return '/conwnet/github1s';
	}

	// build the blob page path
	// startLine/endLine begins from 1
	// eslint-disable-next-line max-len
	buildBlobPath(repo: string, ref: string, filePath: string, startLine?: number, endLine?: number): Promisable<string> {
		return '/conwnet/github1s';
	}
	// build the commit list page path
	buildCommitListPath(repo: string): Promisable<string> {
		return '/conwnet/github1s';
	}

	// build the commit page path
	buildCommitPath(repo: string, commitSha: string): Promisable<string> {
		return '/conwnet/github1s';
	}

	// build the code review list page path
	buildCodeReviewListPath(repo: string): Promisable<string> {
		return '/conwnet/github1s';
	}

	// build the code review page path
	buildCodeReviewPath(repo: string, codeReviewId: string): Promisable<string> {
		return '/conwnet/github1s';
	}

	// convert giving path to the external link (using for jumping back to origin platform)
	buildExternalLink(path: string): Promisable<string> {
		return '/conwnet/github1s';
	}
}

export enum CodeReviewType {
	PullRequest = 'PullRequest',
	MergeRequest = 'MergeRequest',
	ChangeRequest = 'ChangeRequest',
	CodeReview = 'CodeReview', // as fallback
}

export enum PlatformName {
	GitHub = 'GitHub',
	GitLab = 'GitLab',
	Bitbucket = 'Bitbucket',
	OfficialPage = 'OfficialPage', // as fallback
}

export interface Adapter {
	// specify which scheme of workspace should current adapter should work with
	readonly scheme: string;
	// platform name, using for displaying text such as: `open on **GitHub**`
	readonly platformName: PlatformName;
	// the code review type
	readonly codeReviewType?: CodeReviewType;

	resolveDataSource(): Promisable<DataSource>;
	resolveRouterParser(): Promisable<RouterParser>;
	activateAsDefault?(): Promisable<void>;
	deactivateAsDefault?(): Promisable<void>;
}
