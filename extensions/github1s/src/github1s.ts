/**
 * @file GitHub1s Type Definitions
 * @author netcon
 */

// prettier-ignore

import * as url from 'url';

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
	character: number;
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
	ref: string;
}

interface CodeLocation {
	// we can set `scope` to marked that current
	// result is referenced to another repository
	scope?: ResourceScope;
	path: string;
	ranges: Range[];
}

enum CodeReviewStatus {
	Opening = 'Opening', // icon: 🟢
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

// the string will be rendered use markdown format
type MarkdownString = string;

export abstract class DataSourceProvider {
	constructor(public schema: string) {}

	// if `recursive` is true, it should try to return all subtrees
	abstract provideDirectory(
		repo: string,
		ref: string,
		path: string,
		recursive: boolean
	): ReturnType<Directory[]>;

	// the ref here may be a commitSha, branch, tag, or 'HEAD'
	abstract provideFile(
		repo: string,
		ref: string,
		path: string
	): ReturnType<File>;

	abstract provideBranches(
		repo: string,
		offset: number,
		limit: number
	): ReturnType<Branch[]>;

	abstract provideBranch(
		repo: string,
		branch: string
	): ReturnType<Branch | null>;

	abstract provideTags(
		repo: string,
		offset: number,
		limit: number
	): ReturnType<Tag[]>;

	abstract provideTag(repo: string, tag: string): ReturnType<Tag | null>;

	abstract provideCommits(
		repo: string,
		offset: number,
		limit: number
	): ReturnType<Commit[]>;

	// the commit history of a file
	abstract provideFileCommits(
		repo: string,
		path: string,
		offset: number,
		limit: number
	): ReturnType<Commit[]>;

	// the ref here may be a commitSha, branch, tag, or 'HEAD'
	abstract provideCommit(repo: string, ref: string): ReturnType<Commit | null>;

	// use `report` to populate search results gradually
	abstract provideTextSearchResults(
		repo: string,
		ref: string,
		query: string,
		options: CodeSearchOptions,
		report: (results: CodeLocation[]) => void
	): ReturnType<{ limitHit: boolean }>;

	abstract provideCodeReviews(
		repo: string,
		offset: number,
		limit: number
	): ReturnType<CodeReview[]>;

	abstract provideCodeReview(
		repo: string,
		id: number
	): ReturnType<CodeReview | null>;

	abstract provideFileBlameRanges(
		repo: string,
		ref: string,
		path: string
	): ReturnType<FileBlameRange[]>;

	abstract provideCodeDefinition(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): ReturnType<CodeLocation | CodeLocation[]>;

	abstract provideCodeReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): ReturnType<CodeLocation[]>;

	abstract provideCodeHover(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): ReturnType<MarkdownString>;
}

export abstract class Router {
	public state: url.URL = null;

	public initialize(urlOrPath: string) {
		this.state = new url.URL(urlOrPath);
	}

	public push(url: string) {
		// this.history.push(url);
	}
}

export abstract class Platform {}
