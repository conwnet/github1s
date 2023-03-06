/**
 * @file parse gitlab path
 * @author netcon
 */

import { parsePath } from 'history';
import { PageType, RouterState } from '../types';
import { GitLab1sDataSource } from './data-source';
import { SourcegraphDataSource } from '@/adapters/sourcegraph/data-source';

const resolveBranchName = async (repo: string, ref = '') => {
	if (ref && ref.toUpperCase() !== 'HEAD') {
		return ref;
	}
	const dataSource = GitLab1sDataSource.getInstance();
	// const dataSource = SourcegraphDataSource.getInstance('gitlab');
	return (await dataSource.provideRepository(repo))?.defaultBranch || 'HEAD';
};

const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');
	const restParts = dashIndex < 0 ? [] : pathParts.slice(dashIndex + 2);
	const dataSource = GitLab1sDataSource.getInstance();
	const { ref, path: filePath } = await dataSource.extractRefPath(repo, restParts.join('/'));

	return { pageType: PageType.Tree, repo, ref: await resolveBranchName(repo, ref), filePath };
};

const parseBlobUrl = async (path: string): Promise<RouterState> => {
	const routerState = (await parseTreeUrl(path)) as any;
	const { hash: routerHash } = parsePath(path);

	if (!routerHash) {
		return { ...routerState, pageType: PageType.Blob };
	}

	// get selected line number range from path which looks like:
	// `/gitlab-org/gitlab/-/blob/HEAD/package.json#L10-L20`
	const matches = routerHash.match(/^#L(\d+)(?:-L(\d+))?/);
	const [_, startLineNumber = '0', endLineNumber] = matches ? matches : [];

	return {
		...routerState,
		pageType: PageType.Blob,
		startLine: parseInt(startLineNumber, 10),
		endLine: parseInt(endLineNumber || startLineNumber, 10),
	};
};

const parseCommitsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');
	const ref = await resolveBranchName(repo, (dashIndex < 0 ? [] : pathParts.slice(dashIndex + 2)).join('/'));

	return { repo, pageType: PageType.CommitList, ref };
};

const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const dashIndex = pathParts.indexOf('-');
	const repo = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');
	const commitSha = await resolveBranchName(repo, (dashIndex < 0 ? [] : pathParts.slice(dashIndex + 2)).join('/'));

	return { repo, pageType: PageType.Commit, ref: commitSha, commitSha };
};

const parsePullsUrl = async (path: string): Promise<RouterState> => {
	const [owner, repo] = parsePath(path).pathname!.split('/').filter(Boolean);

	return {
		repo: `${owner}/${repo}`,
		ref: 'HEAD',
		pageType: PageType.CodeReviewList,
	};
};

const parsePullUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, , _pageType, codeReviewId] = pathParts;
	const repoFullName = `${owner}/${repo}`;
	const codeReview = await GitLab1sDataSource.getInstance().provideCodeReview(repoFullName, codeReviewId);

	return {
		repo: `${owner}/${repo}`,
		pageType: PageType.CodeReview,
		ref: codeReview.base.commitSha,
		codeReviewId,
	};
};

// const parseSearchUrl = async (path: string): Promise<RouterState> => {
// 	const { pathname, search } = parsePath(path);
// 	const pathParts = pathname!.split('/').filter(Boolean);
// 	const [owner, repo, _pageType] = pathParts;
// 	const queryOptions = queryString.parse(search || '');
// 	const query = typeof queryOptions.q === 'string' ? queryOptions.q : '';
// 	const isRegex = queryOptions.regex === 'yes';
// 	const isCaseSensitive = queryOptions.case === 'yes';
// 	const matchWholeWord = queryOptions.whole === 'yes';
// 	const filesToInclude = typeof queryOptions['files-to-include'] === 'string' ? queryOptions['files-to-include'] : '';
// 	const filesToExclude = typeof queryOptions['files-to-exclude'] === 'string' ? queryOptions['files-to-exclude'] : '';

// 	return {
// 		repo: `${owner}/${repo}`,
// 		pageType: PageType.Search,
// 		ref: 'HEAD',
// 		query,
// 		isRegex,
// 		isCaseSensitive,
// 		matchWholeWord,
// 		filesToInclude,
// 		filesToExclude,
// 	};
// };

const PAGE_TYPE_MAP = {
	tree: PageType.Tree,
	blob: PageType.Blob,
	merge_requests: PageType.CodeReview,
	commit: PageType.Commit,
	commits: PageType.CommitList,
};

export const parseGitLabPath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];
	const dashIndex = pathParts.indexOf('-');
	const typeSegment = dashIndex < 0 ? '' : pathParts[dashIndex + 1];
	const pageType = typeSegment ? PAGE_TYPE_MAP[typeSegment] || PageType.Unknown : PageType.Tree;

	if (pathParts.length) {
		switch (pageType) {
			case PageType.Tree:
			case PageType.Unknown:
				return parseTreeUrl(path);
			case PageType.Blob:
				return parseBlobUrl(path);
			case PageType.CodeReview:
				return parsePullUrl(path);
			case PageType.Commit:
				return parseCommitUrl(path);
			case PageType.CommitList:
				return parseCommitsUrl(path);
		}
	}

	// fallback to default
	const fallbackRepository = 'gitlab-org/gitlab-docs';
	return {
		repo: fallbackRepository,
		ref: await resolveBranchName(fallbackRepository),
		pageType: PageType.Tree,
		filePath: '',
	};
};
