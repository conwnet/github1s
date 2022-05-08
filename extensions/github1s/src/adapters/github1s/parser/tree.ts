/**
 * @file GitHub Tree Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { GitHub1sDataSource } from '../data-source';
import { PageType, RouterState } from '../../types';

export const extractGitHubRef = async (
	repoFullName: string,
	refAndFilePath: string
): Promise<{ ref: string; path: string }> => {
	if (!refAndFilePath) {
		return { ref: 'HEAD', path: '' };
	}
	if (refAndFilePath.match(/^HEAD(\/.*)?$/i)) {
		return { ref: 'HEAD', path: refAndFilePath.slice(5) };
	}

	return GitHub1sDataSource.getInstance().extractGitHubRef(repoFullName, refAndFilePath);
};

export const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...restParts] = pathParts;
	const repoFullName = `${owner}/${repo}`;
	const { ref, path: filePath } = await extractGitHubRef(repoFullName, restParts.join('/'));

	return { pageType: PageType.Tree, repo: repoFullName, ref, filePath };
};
