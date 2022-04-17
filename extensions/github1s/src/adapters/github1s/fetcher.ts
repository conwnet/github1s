/**
 * @file github api fetcher base octokit
 * @author netcon
 */

import { Octokit } from '@octokit/core';
import { GitHub1sAuthenticationView } from './authentication';
import { GitHubTokenManager } from './token';

export const errorMessages = {
	noPermission: {
		anonymous: 'You have no permission for this operation, please authenticate to github and retry',
		authenticated: 'You have no permission for this operation, please try another account',
	},
	rateLimited: {
		anonymous: 'API Rate Limit Exceeded, please authenticate to github and retry',
		authenticated: 'API Rate Limit Exceeded for this token, please try another account',
	},
	badCredentials: {
		anonymous: 'Bad credentials, please authenticate to github and retry',
		authenticated: 'This token is invalid, please try another one',
	},
};

const detectErrorMessage = (response: any, authenticated: boolean) => {
	if (response?.status === 403 && +response?.headers?.['x-ratelimit-remaining'] === 0) {
		return errorMessages.rateLimited[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 401 && +response?.data?.message?.includes?.('Bad credentials')) {
		return errorMessages.badCredentials[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 403) {
		return errorMessages.noPermission[authenticated ? 'authenticated' : 'anonymous'];
	}
	return response?.data?.message || '';
};

export class GitHubFetcher {
	private static instance: GitHubFetcher | null = null;
	private accessToken: string = '';
	private octokit: Octokit | null = null;

	private constructor() {
		this.accessToken = GitHubTokenManager.getInstance().getToken();
		this.octokit = new Octokit({ auth: this.accessToken, request: { fetch } });
	}

	public static getInstance(): GitHubFetcher {
		if (GitHubFetcher.instance) {
			return GitHubFetcher.instance;
		}
		return (GitHubFetcher.instance = new GitHubFetcher());
	}

	private getOctokit() {
		const currentAccessToken = GitHubTokenManager.getInstance().getToken();
		if (this.accessToken === currentAccessToken) {
			return this.octokit!;
		}
		this.accessToken = currentAccessToken;
		this.octokit = new Octokit({ auth: this.accessToken, request: { fetch } });
		return this.octokit;
	}

	public request(...args: Parameters<Octokit['request']>): ReturnType<Octokit['request']> {
		const octokit = this.getOctokit();
		return octokit.request(...args).catch(async (error) => {
			if ([403, 401].includes((error as any)?.response?.status)) {
				// maybe we have to acquire github access token to continue
				const message = detectErrorMessage(error?.response, !!this.accessToken);
				await GitHub1sAuthenticationView.getInstance().open(message, true);
				return this.request(...args);
			}
			throw error;
		});
	}

	public async graphql(...args: Parameters<Octokit['graphql']>): ReturnType<Octokit['graphql']> {
		// graphql API only worked for authenticated users
		if (!GitHubTokenManager.getInstance().getToken()) {
			const message = 'GraphQL API only worked for authenticated users';
			await GitHub1sAuthenticationView.getInstance().open(message, true);
		}
		const octokit = this.getOctokit();
		return octokit.graphql(...args);
	}
}
