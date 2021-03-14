/**
 * @file GitHub Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { parseTreeUrl } from './tree';
import { parseBlobUrl } from './blob';
import { parsePullUrl } from './pull';
import { PageType, RouterState } from '../types';

// detect concrete PageType the *third part* in url.path
const detectPageTypeFromPathParts = (pathParts: string[]): PageType => {
	const PAGE_TYPE_MAP = {
		tree: PageType.TREE,
		blob: PageType.BLOB,
		pull: PageType.PULL,
		// TODO: implements below types
		// pulls: PageType.PULL_LIST,
		// commits: PageType.COMMIT_LIST,
		// commit: PageType.COMMIT,
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
	}

	// fallback to default
	return {
		owner: 'conwnet',
		repo: 'github1s',
		pageType: PageType.TREE,
		ref: 'HEAD',
	};
};
