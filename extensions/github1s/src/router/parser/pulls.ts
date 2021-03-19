/**
 * @file GitHub Pull List Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import repository from '@/repository';
import { RouterState, PageType } from '../types';

export const parsePullsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname.split('/').filter(Boolean);
	const [owner, repo] = pathParts;

	return {
		owner,
		repo,
		pageType: PageType.PULL_LIST,
		ref: 'HEAD',
	};
};
