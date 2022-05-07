/**
 * @file GitHub Tree Url Parser
 * @author netcon
 */

import { PageType, RouterState } from '../../types';
import { parsePath } from 'history';
import { GitHubFetcher } from '../fetcher';
import { SourcegraphDataSource } from '@/adapters/sourcegraph/data-source';

const detectRefWithSourcegraphApi = async (repoFullName: string, refAndFilePath: string) => {
	const dataSource = SourcegraphDataSource.getInstance('github');
	const [firstPart] = refAndFilePath.split('/');

	const searchOptions = { page: 1, pageSize: 99999, query: firstPart };
	const [matchedBranches, matchedTags] = await Promise.all([
		dataSource.provideBranches(repoFullName, searchOptions),
		dataSource.provideTags(repoFullName, searchOptions),
	]);
	const exactRef = [...matchedBranches, ...matchedTags].find(
		(ref) => refAndFilePath === ref.name || refAndFilePath.startsWith(`${ref.name}/`)
	);
	const ref = exactRef ? exactRef.name : firstPart;
	return { ref, path: refAndFilePath.slice(ref.length + 1) };
};

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

	if (GitHubFetcher.getInstance().useSourcegraphApiFirst()) {
		try {
			return await detectRefWithSourcegraphApi(repoFullName, refAndFilePath);
		} catch (e) {}
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
