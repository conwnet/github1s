/**
 * @file parse gitlab path
 * @author netcon
 */

import { parsePath } from 'history';
import { PageType, RouterState } from '../types';
import { SourcegraphDataSource } from '@/adapters/sourcegraph/data-source';

const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');
	const restParts = dashIndex < 0 ? [] : pathParts.slice(dashIndex + 2);
	const dataSource = SourcegraphDataSource.getInstance('gitlab');
	const { ref, path: filePath } = await dataSource.extractRefPath(repo, restParts.join('/'));

	return { pageType: PageType.Tree, repo, ref, filePath };
};

const parseBlobUrl = async (path: string): Promise<RouterState> => {
	const routerState = (await parseTreeUrl(path)) as any;
	const { hash: routerHash } = parsePath(path);

	if (!routerHash) {
		return { ...routerState, pageType: PageType.Blob };
	}

	// get selected line number range from path which looks like:
	// `/gitlab-org/gitlab/-/blob/HEAD/package.json#L10-L20`
	const matches = routerHash.match(/^#L(\d+)(?:-L(\d+))?/);
	const [_, startLineNumber = '0', endLineNumber] = matches ? matches : [];

	return {
		...routerState,
		pageType: PageType.Blob,
		startLine: parseInt(startLineNumber, 10),
		endLine: parseInt(endLineNumber || startLineNumber, 10),
	};
};

const parseCommitsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');
	const ref = (dashIndex < 0 ? ['HEAD'] : pathParts.slice(dashIndex + 2)).join('/');

	return { repo, pageType: PageType.CommitList, ref };
};

const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');
	const commitSha = (dashIndex < 0 ? ['HEAD'] : pathParts.slice(dashIndex + 2)).join('/');

	return { repo, pageType: PageType.Commit, ref: commitSha, commitSha };
};

const PAGE_TYPE_MAP = {
	tree: PageType.Tree,
	blob: PageType.Blob,
	commit: PageType.Commit,
	commits: PageType.CommitList,
};

export const parseGitLabPath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];
	const dashIndex = pathParts.indexOf('-');
	const typeSegment = dashIndex < 0 ? '' : pathParts[dashIndex + 1];
	const pageType = typeSegment ? PAGE_TYPE_MAP[typeSegment] || PageType.Unknown : PageType.Tree;

	if (pathParts.length) {
		switch (pageType) {
			case PageType.Tree:
			case PageType.Unknown:
				return parseTreeUrl(path);
			case PageType.Blob:
				return parseBlobUrl(path);
			case PageType.Commit:
				return parseCommitUrl(path);
			case PageType.CommitList:
				return parseCommitsUrl(path);
		}
	}

	// fallback to default
	return {
		repo: 'gitlab-org/gitlab-docs',
		ref: 'HEAD',
		pageType: PageType.Tree,
		filePath: '',
	};
};
