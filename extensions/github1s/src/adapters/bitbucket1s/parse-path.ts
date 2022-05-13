/**
 * @file parse bitbucket path
 * @author netcon
 */

import { parsePath } from 'history';
import { FileType, PageType, RouterState } from '@/adapters/types';
import { SourcegraphDataSource } from '../sourcegraph/data-source';

const parseTreeOrBlobUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...restParts] = pathParts;
	const repoFullName = `${owner}/${repo}`;
	const dataSource = SourcegraphDataSource.getInstance('bitbucket');
	const { ref, path: filePath } = await dataSource.extractRefPath(repoFullName, restParts.join('/'));
	const fileType = await dataSource.detectPathFileType(repo, ref, filePath);

	return { pageType: fileType === FileType.Directory ? PageType.Tree : PageType.Blob, repo, ref, filePath };
};

const parseCommitsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...refParts] = pathParts;

	return {
		repo: `${owner}/${repo}`,
		pageType: PageType.CommitList,
		ref: refParts.length ? refParts.join('/') : 'HEAD',
	};
};

const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...refParts] = pathParts;
	const commitSha = refParts.join('/');

	return { repo: `${owner}/${repo}`, pageType: PageType.Commit, ref: commitSha, commitSha };
};

const PAGE_TYPE_MAP = {
	src: PageType.Tree,
	commit: PageType.Commit,
	commits: PageType.CommitList,
};

export const parseBitbucketPath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];
	// detect concrete PageType the *third part* in url.path
	const pageType = pathParts[2] ? PAGE_TYPE_MAP[pathParts[2]] || PageType.Unknown : PageType.Tree;

	if (pathParts.length >= 2) {
		switch (pageType) {
			case PageType.Tree:
				return parseTreeOrBlobUrl(path);
			case PageType.Commit:
				return parseCommitUrl(path);
			case PageType.CommitList:
				return parseCommitsUrl(path);
		}
	}

	// fallback to default
	return {
		repo: 'atlassian/clover',
		ref: 'HEAD',
		pageType: PageType.Tree,
		filePath: '',
	};
};
