/**
 * @file GitLab Url Parser
 * @author netcon
 */

import { PageType, RouterState } from '@/adapters/types';
import { parsePath } from 'history';
import { parseTreeUrl } from './tree';
import { parseBlobUrl } from './blob';
import { parseCommitsUrl } from './commits';
import { parseCommitUrl } from './commit';

const PAGE_TYPE_MAP = {
	tree: PageType.Tree,
	blob: PageType.Blob,
	commit: PageType.Commit,
	commits: PageType.CommitList,
};

export const parseGitLabPath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];
	const dashIndex = pathParts.indexOf('-');
	const typeSegment = dashIndex > 0 && pathParts[dashIndex + 1];
	const pageType = typeSegment ? PAGE_TYPE_MAP[typeSegment] || PageType.Unknown : PageType.Tree;

	if (dashIndex > 0) {
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
