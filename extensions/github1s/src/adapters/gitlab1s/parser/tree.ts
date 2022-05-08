/**
 * @file GitLab Tree Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { PageType, RouterState } from '../../types';
import { SourcegraphDataSource } from '@/adapters/sourcegraph/data-source';

export const extractRefPath = async (
	repoFullName: string,
	refAndFilePath: string
): Promise<{ ref: string; path: string }> => {
	if (!refAndFilePath) {
		return { ref: 'HEAD', path: '' };
	}
	if (refAndFilePath.match(/^HEAD(\/.*)?$/i)) {
		return { ref: 'HEAD', path: refAndFilePath.slice(5) };
	}

	return SourcegraphDataSource.getInstance('gitlab').extractRefPath(repoFullName, refAndFilePath);
};

export const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = pathParts.slice(0, dashIndex).join('/');
	const restParts = pathParts.slice(dashIndex + 2);
	const { ref, path: filePath } = await extractRefPath(repo, restParts.join('/'));

	return { pageType: PageType.Tree, repo, ref, filePath };
};
