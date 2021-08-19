/**
 * @file GitHub Pull List Url Parser
 * @author netcon
 */

import { PageType, RouterState } from 'github1s';
import { parsePath } from 'history';

export const parsePullsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname.split('/').filter(Boolean);
	const [owner, repo] = pathParts;

	return {
		repo,
		ref: 'HEAD',
		type: PageType.CODE_REVIEW_LIST,
	};
};
