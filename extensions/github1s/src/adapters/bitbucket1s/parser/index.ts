/**
 * @file Bitbucket Url Parser
 * @author netcon
 */

import { PageType, RouterState } from '@/adapters/types';
import { parsePath } from 'history';
import { parseTreeOrBlobUrl } from './tree';
import { parseCommitsUrl } from './commits';
import { parseCommitUrl } from './commit';

const PAGE_TYPE_MAP = {
	src: PageType.Tree,
	commit: PageType.Commit,
	commits: PageType.CommitList,
};

export const parseBitbucketPath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];
	// detect concrete PageType the *third part* in url.path
	const pageType = pathParts[2] ? PAGE_TYPE_MAP[pathParts[2]] || PageType.Unknown : PageType.Tree;

	if (pathParts.length >= 2) {
		switch (pageType) {
			case PageType.Tree:
				return parseTreeOrBlobUrl(path);
			case PageType.Commit:
				return parseCommitUrl(path);
			case PageType.CommitList:
				return parseCommitsUrl(path);
		}
	}

	// fallback to default
	return {
		repo: 'atlassian/clover',
		ref: 'HEAD',
		pageType: PageType.Tree,
		filePath: '',
	};
};
