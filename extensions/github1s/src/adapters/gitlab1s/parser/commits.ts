/**
 * @file GitLab Commit List Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { RouterState, PageType } from '../../types';

export const parseCommitsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = pathParts.slice(0, dashIndex).join('/');
	const ref = pathParts.slice(dashIndex + 2).join('/') || 'HEAD';

	return { repo, pageType: PageType.CommitList, ref };
};
