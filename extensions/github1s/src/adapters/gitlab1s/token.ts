/**
 * @file gitlab api auth token manager
 */

import * as vscode from 'vscode';
import { GitHubTokenManager, ValidateResult } from '../github1s/token';
import { getBrowserUrl } from '@/helpers/context';
import { parseRepoFromBrowserUrl } from './parse-path';
import { resolveGitLabApiUrl } from './api-url';

export const normalizeGitLabToken = (accessToken: string): string =>
	accessToken.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

export const buildGitLabAuthHeaders = (accessToken: string): Record<string, string> => {
	const token = normalizeGitLabToken(accessToken);
	if (token.startsWith('glpat-') || token.startsWith('glptt-')) {
		return { 'PRIVATE-TOKEN': token };
	}
	if (token.includes('.')) {
		return { Authorization: `Bearer ${token}` };
	}
	return { 'PRIVATE-TOKEN': token };
};

export const gitLabAuthHeaderAttempts = (accessToken: string): Record<string, string>[] => {
	const token = normalizeGitLabToken(accessToken);
	const attempts: Record<string, string>[] = [{ 'PRIVATE-TOKEN': token }, { Authorization: `Bearer ${token}` }];
	const seen = new Set<string>();
	return attempts.filter((headers) => {
		const key = JSON.stringify(headers);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
};

const resolveValidationRepo = (browserUrl: string): string => {
	const repoFromUrl = parseRepoFromBrowserUrl(browserUrl);
	if (repoFromUrl) {
		return repoFromUrl;
	}
	return GITLAB_TEST_PROJECT || '';
};

const readResponseFailureHint = async (response: Response, repo: string): Promise<string> => {
	const status = response.status;
	let message = '';
	try {
		const data = await response.json();
		message = typeof data?.message === 'string' ? data.message : data?.error || '';
	} catch {
		// ignore non-json bodies
	}
	if (status === 401) {
		return message || 'Unauthorized — check that the token was copied completely.';
	}
	if (status === 403) {
		return message || 'Forbidden — token needs read_api (and read_repository for files).';
	}
	if (status === 404) {
		return message || `Project not found for path "${repo}" — open the correct project URL first.`;
	}
	return message || `HTTP ${status}`;
};

const fetchWithGitLabAuth = async (
	apiPath: string,
	accessToken: string,
	pageUrl: string,
): Promise<{ response: Response; hint?: string }> => {
	const url = resolveGitLabApiUrl(apiPath, pageUrl);
	const attempts = gitLabAuthHeaderAttempts(accessToken);
	let lastResponse = await fetch(url, { headers: attempts[0] });

	for (const headers of attempts.slice(1)) {
		if (lastResponse.ok) {
			return { response: lastResponse };
		}
		lastResponse = await fetch(url, { headers });
	}

	if (lastResponse.ok) {
		return { response: lastResponse };
	}
	return { response: lastResponse, hint: await readResponseFailureHint(lastResponse, '') };
};

export class GitLabTokenManager extends GitHubTokenManager {
	protected static instance: GitLabTokenManager | null = null;
	public tokenStateKey = 'gitlab-oauth-token';

	public static getInstance(): GitLabTokenManager {
		if (GitLabTokenManager.instance) {
			return GitLabTokenManager.instance;
		}
		return (GitLabTokenManager.instance = new GitLabTokenManager());
	}

	private async validateUserToken(accessToken: string, pageUrl: string): Promise<ValidateResult | null> {
		const { response } = await fetchWithGitLabAuth(`${GITLAB_API_PREFIX}/user`, accessToken, pageUrl);
		if (!response.ok) {
			return null;
		}
		const data = await response.json();
		if (!data?.username) {
			return null;
		}
		return {
			username: data.username,
			avatar_url: data.avatar_url,
			profile_url: data.web_url,
		};
	}

	private async validateProjectToken(
		accessToken: string,
		repo: string,
		pageUrl: string,
	): Promise<{ result: ValidateResult | null; hint?: string }> {
		if (!repo) {
			return {
				result: null,
				hint: 'Open http://localhost:8080/group/project or set GITLAB_TEST_PROJECT in .env.local.',
			};
		}
		const encodedRepo = encodeURIComponent(repo);
		const projectUrl = `${GITLAB_API_PREFIX}/projects/${encodedRepo}`;
		const treeUrl = `${projectUrl}/repository/tree?per_page=1&ref=HEAD`;

		let lastHint: string | undefined;
		for (const url of [projectUrl, treeUrl]) {
			const { response, hint } = await fetchWithGitLabAuth(url, accessToken, pageUrl);
			if (!response.ok) {
				lastHint = hint || (await readResponseFailureHint(response, repo));
				continue;
			}
			if (url === treeUrl) {
				return {
					result: {
						username: repo,
						avatar_url: '',
						profile_url: `${GITLAB_ORIGIN}/${repo}`,
					},
				};
			}
			const data = await response.json();
			return {
				result: {
					username: data.path_with_namespace || repo,
					avatar_url: data.avatar_url || '',
					profile_url: data.web_url || `${GITLAB_ORIGIN}/${repo}`,
				},
			};
		}
		return { result: null, hint: lastHint };
	}

	public async validateToken(token?: string): Promise<ValidateResult | null> {
		const accessToken = normalizeGitLabToken(token === undefined ? this.getToken() : token);
		if (!accessToken) {
			return null;
		}

		try {
			const browserUrl = (await getBrowserUrl()) as string;
			const userToken = await this.validateUserToken(accessToken, browserUrl);
			if (userToken) {
				return userToken;
			}

			const repo = resolveValidationRepo(browserUrl);
			const { result, hint } = await this.validateProjectToken(accessToken, repo, browserUrl);
			if (result) {
				return result;
			}

			if (hint) {
				void vscode.window.showWarningMessage(`GitLab token check failed: ${hint}`);
			}
			return null;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			void vscode.window.showWarningMessage(`GitLab token check failed: ${message}`);
			return null;
		}
	}
}
