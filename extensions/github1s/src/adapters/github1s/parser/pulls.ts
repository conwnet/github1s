/**
 * @file GitHub Pull List Url Parser
 * @author netcon
 */

import { PageType, RouterState } from '../../types';
import { parsePath } from 'history';

export const parsePullsUrl = async (path: string): Promise<RouterState> => {
	const [owner, repo] = parsePath(path).pathname.split('/').filter(Boolean);

	return {
		repo: `${owner}/${repo}`,
		ref: 'HEAD',
		type: PageType.CodeReviewList,
	};
};
