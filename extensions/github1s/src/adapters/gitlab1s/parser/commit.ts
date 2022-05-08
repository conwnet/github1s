/**
 * @file GitLab Commit Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { RouterState, PageType } from '../../types';

export const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = pathParts.slice(0, dashIndex).join('/');
	const commitSha = pathParts.slice(dashIndex + 2).join('/');

	return { repo, pageType: PageType.Commit, ref: commitSha, commitSha };
};
