/**
 * @file GitHub Commit List Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { RouterState, PageType } from '../../types';

export const parseCommitsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...refParts] = pathParts;

	return {
		repo: `${owner}/${repo}`,
		pageType: PageType.CommitList,
		ref: refParts.length ? refParts.join('/') : 'HEAD',
	};
};
