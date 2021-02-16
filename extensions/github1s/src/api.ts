/**
 * @file GitHub1s APIs
 * @author netcon
 */

import * as vscode from 'vscode';
// import { getBranches } from './github-api-gql';
import { hasValidToken } from './util';
import { fetch, RequestError, RequestRateLimitError, RequestInvalidTokenError, RequestNotFoundError, throttledReportNetworkError } from './util/fetch';

// TODO: GraphQL API is experimental now, we need more test.
// It maybe crash or slow when there are too many files in one directory.
// For example the repository `git/git`, the TTFB cost about 3 seconds,
// and the response body size exceed 7MB before zip
export const ENABLE_GRAPHQL: boolean = false;

export interface UriState {
	owner: string;
	repo: string;
	path: string;
}

export const isGraphQLEnabled = () => {
	return hasValidToken() && ENABLE_GRAPHQL;
};

const handleRequestError = (error: RequestError) => {
	if (error instanceof RequestRateLimitError) {
		if (!error.token) {
			throw vscode.FileSystemError.NoPermissions('API Rate Limit Exceeded, Please Offer an OAuth Token.');
		}
		throw vscode.FileSystemError.NoPermissions('API Rate Limit Exceeded, Please Change Another OAuth Token.');
	}
	if (error instanceof RequestInvalidTokenError) {
		throw vscode.FileSystemError.NoPermissions('Current OAuth Token Is Invalid, Please Change Another One.');
	}
	if (error instanceof RequestNotFoundError) {
		throw vscode.FileSystemError.NoPermissions('Current OAuth Token Is Invalid, Please Change Another One.');
	}
	if (error instanceof RequestNotFoundError) {
		throw vscode.FileSystemError.FileNotFound('GitHub Resource Not Found');
	}
	throw vscode.FileSystemError.Unavailable(error.message || 'Unknown Error Occurred When Request To GitHub');
};

export const readGitHubDirectory = (owner: string, repo: string, ref: string, path: string) => {
	return fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}${path.replace(/^\//, ':')}`)
		.catch(handleRequestError);
};

export const readGitHubFile = (owner: string, repo: string, fileSha: string) => {
	return fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`)
		.catch(handleRequestError);
};

export const validateToken = (token: string) => {
	const authHeaders = token ? { Authorization: `token ${token}` } : {};
	return self.fetch(`https://api.github.com`, { headers: { ...authHeaders } }).then(response => ({
		token: !!token, // if the token is not empty
		valid: response.status !== 401 ? true : false, // if the request is valid
		limit: +response.headers.get('X-RateLimit-Limit') || 0, // limit count
		remaining: +response.headers.get('X-RateLimit-Remaining') || 0, // remains request count
		reset: +response.headers.get('X-RateLimit-Reset') || 0, // reset time
	})).catch(() => {
		throttledReportNetworkError();
		throw new RequestError('Request Failed, Maybe an Network Error', token);
	});
};

export const getGithubBranches = (owner: string, repo: string) => {
	return fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`)
		.then(branches => {
			// TODO: only no more than 200 branches are supported
			if (branches.length === 100) {
				return fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100&page=2`).then(otherBranches => [...branches, ...otherBranches]);
			}
			return branches;
		})
		.catch(handleRequestError);
};

export const getGithubTags = (owner: string, repo: string) => {
	return fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=100`)
		.then(tags => {
			// TODO: only no more than 200 tags are supported
			if (tags.length === 100) {
				return fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=100&page=2`).then(otherTags => [...tags, ...otherTags]);
			}
			return tags;
		})
		.catch(handleRequestError);
};

export const getGithubAllFiles = (owner: string, repo: string, ref: string, path: string = '/') => {
	return fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}${path.replace(/^\//, ':')}?recursive=1`)
		.catch(handleRequestError);
};

// export const getGitHubBranches = (owner: string, repo: string) => {
// 	if (isGraphQLEnabled()) {
// 		return getBranches(owner, repo);
// 	}
// 	return getGithubBranches(owner, repo);
// };
