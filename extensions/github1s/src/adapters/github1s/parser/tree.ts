/**
 * @file GitHub Tree Url Parser
 * @author netcon
 */

import { PageType, RouterState } from '../../types';
import { parsePath } from 'history';
import { GitHubFetcher } from '../fetcher';

export const extractGitHubRef = async (
	repoFullName: string,
	refAndFilePath: string
): Promise<{ ref: string; path: string }> => {
	if (!refAndFilePath) {
		return { ref: 'HEAD', path: '' };
	}
	if (refAndFilePath.startsWith('HEAD/')) {
		return { ref: 'HEAD', path: refAndFilePath.slice(5) };
	}
	return GitHubFetcher.getInstance()
		.request(`GET /repos/${repoFullName}/git/extract-ref/${refAndFilePath}`)
		.then((response) => {
			return response.data;
		});
};

export const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...restParts] = pathParts;
	const repoFullName = `${owner}/${repo}`;
	const { ref, path: filePath } = await extractGitHubRef(repoFullName, restParts.join('/'));

	return { pageType: PageType.Tree, repo: repoFullName, ref, filePath };
};
