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

const PAGE_TYPE_MAP = {
	tree: PageType.Tree,
	blob: PageType.Blob,
	pulls: PageType.CodeReviewList,
	pull: PageType.CodeReview,
	commit: PageType.Commit,
	commits: PageType.CommitList,
};

export const parseGitHubPath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];
	// detect concrete PageType the *third part* in url.path
	const pageType = pathParts[2] ? PAGE_TYPE_MAP[pathParts[2]] || PageType.Unknown : PageType.Tree;

	if (pathParts.length >= 2) {
		switch (pageType) {
			case PageType.Tree:
			case PageType.Unknown:
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
	}

	// fallback to default
	return {
		repo: 'conwnet/github1s',
		ref: 'HEAD',
		pageType: PageType.Tree,
		filePath: '',
	};
};
