/**
 * @file GitHub1s APIs
 * @author netcon
 */

import * as vscode from 'vscode';
import { encodeFilePath } from '@/helpers/util';
import {
	fetch,
	RequestError,
	RequestRateLimitError,
	RequestInvalidTokenError,
	RequestNotFoundError,
	throttledReportNetworkError,
} from '@/helpers/fetch';

export interface UriState {
	owner: string;
	repo: string;
	path: string;
}

const handleFileSystemRequestError = (error: RequestError) => {
	if (error instanceof RequestRateLimitError) {
		if (!error.token) {
			throw vscode.FileSystemError.NoPermissions(
				'API Rate Limit Exceeded, Please Offer an OAuth Token.'
			);
		}
		throw vscode.FileSystemError.NoPermissions(
			'API Rate Limit Exceeded, Please Change Another OAuth Token.'
		);
	}
	if (error instanceof RequestInvalidTokenError) {
		throw vscode.FileSystemError.NoPermissions(
			'Current OAuth Token Is Invalid, Please Change Another One.'
		);
	}
	if (error instanceof RequestNotFoundError) {
		throw vscode.FileSystemError.FileNotFound('GitHub Resource Not Found');
	}
	throw vscode.FileSystemError.Unavailable(
		error.message || 'Unknown Error Occurred When Request To GitHub'
	);
};

export const readGitHubDirectory = async (
	owner: string,
	repo: string,
	ref: string,
	path: string,
	options?: RequestInit
) => {
	const cached = await readGitHubDirectoryCached(owner, repo, ref, path);
	if (cached) {
		return cached;
	}
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}${encodeFilePath(
			path
		).replace(/^\//, ':')}`,
		options
	).catch(handleFileSystemRequestError);
};

export const readGitHubFile = (
	owner: string,
	repo: string,
	fileSha: string,
	options?: RequestInit
) => {
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`,
		options
	).catch(handleFileSystemRequestError);
};

export const validateToken = (token: string) => {
	const authHeaders = token ? { Authorization: `token ${token}` } : {};
	return self
		.fetch(`https://api.github.com/`, { headers: { ...authHeaders } })
		.then((response) => ({
			token: !!token, // if the token is not empty
			valid: response.status !== 401 ? true : false, // if the request is valid
			limit: +response.headers.get('X-RateLimit-Limit') || 0, // limit count
			remaining: +response.headers.get('X-RateLimit-Remaining') || 0, // remains request count
			reset: +response.headers.get('X-RateLimit-Reset') || 0, // reset time
		}))
		.catch(() => {
			throttledReportNetworkError();
			throw new RequestError('Request Failed, Maybe an Network Error', token);
		});
};

// the [List Branches](https://docs.github.com/en/rest/reference/repos#list-branches) API
// only returned max to 100 branches for per request
// [List matching references](https://docs.github.com/en/rest/reference/git#list-matching-references)
// can returned all branches for a request, and there is an issue for this API
// https://github.com/github/docs/issues/3863
export const getGitHubBranchRefs = (
	owner: string,
	repo: string,
	options?: RequestInit
) => {
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/heads`,
		options
	).then((branchRefs) => {
		// the field in branchRef will looks like `refs/heads/<branch>`, we add a name field here
		return branchRefs.map((item) => ({ ...item, name: item.ref.slice(11) }));
	});
};

// It's similar to `getGithubBranchRefs`
export const getGitHubTagRefs = (
	owner: string,
	repo: string,
	options?: RequestInit
) => {
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/tags`,
		options
	).then((tagRefs) => {
		// the field in tagRef will looks like `refs/tags/<tag>`, we add a name field here
		return tagRefs.map((item) => ({ ...item, name: item.ref.slice(10) }));
	});
};

export const getGitHubAllFiles = async (
	owner: string,
	repo: string,
	ref: string,
	path: string = '/'
) => {
	const ret = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}${encodeFilePath(
			path
		).replace(/^\//, ':')}?recursive=1`
	).catch(handleFileSystemRequestError);
	if (path === '/') {
		populateFileTreeCache(owner, repo, ref, ret);
	}
	return ret;
};

export const getGitHubPulls = (
	owner: string,
	repo: string,
	pageNumber = 0,
	pageSize = 100,
	options?: RequestInit
) => {
	// TODO: only recent 100 pull requests are supported now
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&order=created&per_page=${pageSize}&page=${pageNumber}`,
		options
	);
};

export const getGitHubPullDetail = (
	owner: string,
	repo: string,
	pullNumber: number,
	options?: RequestInit
) => {
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
		options
	);
};

export const getGitHubPullFiles = (
	owner: string,
	repo: string,
	pullNumber: number,
	options?: RequestInit
) => {
	// TODO: only the number of change files not greater than 100 are supported now!
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`,
		options
	);
};

export const getGitHubCommits = (
	owner: string,
	repo: string,
	sha: string,
	pageNumber = 0,
	pageSize = 100,
	options?: ResponseInit
) => {
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/commits?sha=${sha}&per_page=${pageSize}&page=${pageNumber}`,
		options
	);
};

export const getGitHubFileCommits = (
	owner: string,
	repo: string,
	filePath: string,
	sha: string,
	options?: ResponseInit
) => {
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/commits?path=${filePath.slice(1)}&sha=${sha}&per_page=100`, // prettier-ignore
		options
	);
};

export const getGitHubCommitDetail = (
	owner: string,
	repo: string,
	commitSha: string,
	options?: RequestInit
) => {
	return fetch(
		`https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`,
		options
	);
};

const repoFileTreeCacheKey = (owner: string, repo: string, ref: string) => {
	return `${owner}/${repo}/${ref}`;
};

async function readGitHubDirectoryCached(
	owner: string,
	repo: string,
	ref: string,
	path: string,
	options?: RequestInit
): Promise<any | null> {
	const cacheKey = repoFileTreeCacheKey(owner, repo, ref);
	if (
		!repoFileTreeCache.has(cacheKey) ||
		repoFileTreeCache.get(cacheKey).expireTime < new Date()
	) {
		// also populate the cache
		await getGitHubAllFiles(owner, repo, ref);
	}
	const cachedFileTree = repoFileTreeCache.get(cacheKey);
	if (cachedFileTree.truncated) {
		return null;
	}

	const nodeItselfAndChildren = cachedFileTree.fileTree.get(
		path.substr(1, path.length - 1)
	);

	const children = nodeItselfAndChildren
		.slice(1, nodeItselfAndChildren.length)
		.map((child) => {
			return path === '/'
				? child
				: {
						// src/main -> main
						path: child.path.substring(path.length, child.path.length),
						mode: child.mode,
						type: child.type,
						sha: child.sha,
						url: child.url,
				  };
		});

	return {
		sha: nodeItselfAndChildren[0].sha,
		url: nodeItselfAndChildren[0].url,
		truncated: false,
		tree: [...children],
	};
}

const repoFileTreeCache: Map<string, CacheEntry> = new Map();

function populateFileTreeCache(
	owner: string,
	repo: string,
	ref: string,
	jsonObj: any
) {
	const cacheKey = repoFileTreeCacheKey(owner, repo, ref);
	if (jsonObj.truncated) {
		/*
		https://docs.github.com/en/rest/reference/git#get-a-tree
		If truncated is true in the response then the number of items in the tree array exceeded our maximum limit.
		If you need to fetch more items, use the non-recursive method of fetching trees, and fetch one sub-tree at a time.
		*/
		repoFileTreeCache.set(cacheKey, {
			owner,
			repo,
			ref,
			sha: jsonObj.sha,
			fileTree: new Map(),
			url: jsonObj.url,
			truncated: true,
			expireTime: new Date(new Date().getTime() + 1000 * 3600 * 24 * 365),
		});
	} else {
		// for SHA, never expires; otherwise 5 seconds expire time.
		const expireTime = /^[0-9a-f]{40}$/.test(ref)
			? new Date(new Date().getTime() + 1000 * 3600 * 24 * 365)
			: new Date(new Date().getTime() + 5000);
		repoFileTreeCache.set(cacheKey, {
			owner,
			repo,
			ref,
			sha: jsonObj.sha,
			fileTree: createFileTree(jsonObj),
			url: jsonObj.url,
			truncated: false,
			expireTime,
		});
	}
}

/**
 * Key: the file path. "" for root path
 * Value: [the node itself, ...the children of the path]
 */
function createFileTree(jsonObj: any): Map<string, GitTreeOrBlobObject[]> {
	const all: GitTreeOrBlobObject[] = jsonObj.tree;
	const ret = new Map();
	all.forEach((item) => {
		const pathSegments = item.path.split('/');
		const parentPath = pathSegments.slice(0, pathSegments.length - 1).join('/');

		if (ret.has(item.path)) {
			ret.set(item.path, [item, ...ret.get(item.path)]);
		} else {
			ret.set(item.path, [item]);
		}

		if (!ret.has(parentPath)) {
			ret.set(parentPath, []);
		}
		ret.get(parentPath).push(item);
	});
	// special handling for root node
	ret.set('', [
		new GitTreeOrBlobObject('', '', 'tree', jsonObj.sha, jsonObj.url),
		...ret.get(''),
	]);
	return ret;
}

class CacheEntry {
	constructor(
		readonly owner: string,
		readonly repo: string,
		readonly ref: string,
		readonly sha: string,
		readonly fileTree: Map<string, GitTreeOrBlobObject[]>,
		readonly url: string,
		readonly truncated: boolean,
		readonly expireTime: Date
	) {}
}

class GitTreeOrBlobObject {
	constructor(
		readonly path: string,
		readonly mode: string,
		readonly type: string,
		readonly sha: string,
		readonly url: string
	) {}
}
