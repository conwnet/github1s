/**
 * @file GitHub Url Parser
 * @author netcon
 */

import { PageType, RouterState } from '@/adapters/types';
import { parsePath } from 'history';
import { parseTreeUrl } from './tree';
import { parseBlobUrl } from './blob';
import { parsePullsUrl } from './pulls';
import { parsePullUrl } from './pull';
import { parseCommitsUrl } from './commits';
import { parseCommitUrl } from './commit';

// detect concrete PageType the *third part* in url.path
const detectPageTypeFromPathParts = (pathParts: string[]): PageType => {
	const PAGE_TYPE_MAP = {
		tree: PageType.Tree,
		blob: PageType.Blob,
		pulls: PageType.CodeReviewList,
		pull: PageType.CodeReview,
		commit: PageType.Commit,
		commits: PageType.CommitList,
	};
	return PAGE_TYPE_MAP[pathParts[2]] || PageType.Tree;
};

export const parseGitHubUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname.split('/').filter(Boolean);
	const pageType = detectPageTypeFromPathParts(pathParts);

	switch (pageType) {
		case PageType.Tree:
			return parseTreeUrl(path);
		case PageType.Blob:
			return parseBlobUrl(path);
		case PageType.CodeReview:
			return parsePullUrl(path);
		case PageType.CodeReviewList:
			return parsePullsUrl(path);
		case PageType.Commit:
			return parseCommitUrl(path);
		case PageType.CommitList:
			return parseCommitsUrl(path);
	}

	// fallback to default
	return {
		repo: 'conwnet/github1s',
		type: PageType.Tree,
		ref: 'HEAD',
		filePath: '',
	};
};
