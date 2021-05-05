/**
 * @file GitHub Pull Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import repository from '@/repository';
import { RouterState, PageType } from '../types';

export const parsePullUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname.split('/').filter(Boolean);
	const [owner, repo, _pageType, pullNumber] = pathParts;
	const repositoryPull = await repository.getPullManager().getItem(+pullNumber);

	return {
		owner,
		repo,
		pageType: PageType.PULL,
		ref: repositoryPull?.head.sha || 'HEAD',
		pullNumber: +pullNumber,
	};
};
