/**
 * @file GitHub Blob Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { PageType, RouterState } from '../../types';
import { parseTreeUrl } from './tree';

export const parseBlobUrl = async (path: string): Promise<RouterState> => {
	const routerState = await parseTreeUrl(path);
	const { hash: routerHash } = parsePath(path);

	if (!routerHash) {
		return { ...routerState, pageType: PageType.BLOB };
	}

	// get selected line number range from path which looks like:
	// `/conwnet/github1s/blob/HEAD/package.json#L10-L20`
	const matches = routerHash.match(/^#L(\d+)(?:-L(\d+))?/);
	const [_, startLineNumber = '0', endLineNumber] = matches ? matches : [];

	return {
		...routerState,
		pageType: PageType.BLOB,
		startLineNumber: parseInt(startLineNumber, 10),
		endLineNumber: parseInt(endLineNumber || startLineNumber, 10),
	};
};
