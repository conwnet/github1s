/**
 * @file GitHub Commit Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { RouterState, PageType } from '../types';

export const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname.split('/').filter(Boolean);
	const [owner, repo, _pageType, commitSha] = pathParts;

	return { owner, repo, pageType: PageType.COMMIT, ref: commitSha, commitSha };
};
