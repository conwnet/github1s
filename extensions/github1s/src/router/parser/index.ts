/**
 * @file GitHub Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { parseTreeUrl } from './tree';
import { parseBlobUrl } from './blob';
import { parsePullsUrl } from './pulls';
import { parsePullUrl } from './pull';
import { parseCommitsUrl } from './commits';
import { parseCommitUrl } from './commit';
import { PageType, RouterState } from '../types';

// detect concrete PageType the *third part* in url.path
const detectPageTypeFromPathParts = (pathParts: string[]): PageType => {
	const PAGE_TYPE_MAP = {
		tree: PageType.TREE,
		blob: PageType.BLOB,
		pulls: PageType.PULL_LIST,
		pull: PageType.PULL,
		commit: PageType.COMMIT,
		commits: PageType.COMMIT_LIST,
	};
	return PAGE_TYPE_MAP[pathParts[2]] || PageType.TREE;
};

export const parseGitHubUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname.split('/').filter(Boolean);
	const pageType = detectPageTypeFromPathParts(pathParts);

	switch (pageType) {
		case PageType.TREE:
			return parseTreeUrl(path);
		case PageType.BLOB:
			return parseBlobUrl(path);
		case PageType.PULL:
			return parsePullUrl(path);
		case PageType.PULL_LIST:
			return parsePullsUrl(path);
		case PageType.COMMIT:
			return parseCommitUrl(path);
		case PageType.COMMIT_LIST:
			return parseCommitsUrl(path);
	}

	// fallback to default
	return {
		owner: 'conwnet',
		repo: 'github1s',
		pageType: PageType.TREE,
		ref: 'HEAD',
	};
};
