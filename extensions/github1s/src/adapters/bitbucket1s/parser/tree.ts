/**
 * @file Bitbucket Tree Url Parser
 * @author netcon
 */

import { parsePath } from 'history';
import { FileType, PageType, RouterState } from '../../types';
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

	return SourcegraphDataSource.getInstance('bitbucket').extractRefPath(repoFullName, refAndFilePath);
};

export const parseTreeOrBlobUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...restParts] = pathParts;
	const repoFullName = `${owner}/${repo}`;
	const { ref, path: filePath } = await extractRefPath(repoFullName, restParts.join('/'));
	const fileType = await SourcegraphDataSource.getInstance('bitbucket').detectPathFileType(repo, ref, filePath);

	return { pageType: fileType === FileType.Directory ? PageType.Tree : PageType.Blob, repo, ref, filePath };
};
