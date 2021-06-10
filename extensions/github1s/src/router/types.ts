/**
 * @file Router types
 * @author netcon
 */

export enum PageType {
	// show the structure of a dictionary
	// e.g. https://github.com/conwnet/github1s/tree/master/src/vs
	TREE = 1,

	// show the content for a file
	// e.g. https://github.com/conwnet/github1s/blob/master/extensions/github1s/src/extension.ts
	BLOB = 2,

	// show the pull request list of a repository
	// e.g. https://github.com/conwnet/github1s/pulls
	PULL_LIST = 3,

	// show the detail of a pull request
	// e.g. https://github.com/conwnet/github1s/pull/81
	PULL = 4,

	// show the commit list of a repository
	// e.g. https://github.com/conwnet/github1s/commits/master
	COMMIT_LIST = 5,

	// show the detail of a commit
	// e.g. https://github.com/conwnet/github1s/commit/c1264f7338833c7aa3a502c4629df8aa6b7d6ccf
	COMMIT = 6,

	// branches, tags, wiki, gist should be on the way
	UNKNOWN = 0,
}

export interface RouterState {
	// the repo owner
	owner: string;

	// the repo name
	repo: string;

	// the page type
	pageType: PageType;

	// the ref(branch/tag/commit) of current workspace.
	// when `pageType` is TREE/BLOB, and we can't find ref directly,
	// we have to fetch all refs to find right one.
	// when `pageType` is COMMIT, the ref should be the commit id
	// when `pageType` is PULL, the ref should be the `source commit`
	ref: string;

	// current file path
	filePath?: string;

	// the one-based line numbers specified which lines should focus
	// after opening the file, only exists when pageType is `BLOB`
	startLineNumber?: number;
	endLineNumber?: number;

	// only exists when the page type is PULL
	pullNumber?: number;

	// only exists when the page type is COMMIT
	commitSha?: string;
}
