/**
 * @file Bitbucket Commit Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { RouterState, PageType } from '../../types';

export const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...refParts] = pathParts;
	const commitSha = refParts.join('/');

	return { repo: `${owner}/${repo}`, pageType: PageType.Commit, ref: commitSha, commitSha };
};
