/**
 * @file GitHub Blob Url Parser
 * @author netcon
 */

import { PageType, RouterState } from '../types';
import { parseTreeUrl } from './tree';

export const parseBlobUrl = async (path: string): Promise<RouterState> => {
	const routerState = await parseTreeUrl(path);

	return { ...routerState, pageType: PageType.BLOB };
};
