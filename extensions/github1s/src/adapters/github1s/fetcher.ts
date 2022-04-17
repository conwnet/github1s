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

// initial fetcher methods in this way for correct `request/graphql` type inference
const initFetcherMethods = (accessToken: string, fetcher: GitHubFetcher) => {
	const octokit = new Octokit({ auth: accessToken, request: { fetch } });

	fetcher.request = Object.assign((...args: Parameters<Octokit['request']>) => {
		return octokit.request(...args).catch(async (error) => {
			if ([403, 401].includes((error as any)?.response?.status)) {
				// maybe we have to acquire github access token to continue
				const message = detectErrorMessage(error?.response, !!accessToken);
				await GitHub1sAuthenticationView.getInstance().open(message, true);
				return octokit.request(...args);
			}
			throw error;
		});
	}, octokit.request);

	fetcher.graphql = Object.assign(async (...args: Parameters<Octokit['graphql']>) => {
		// graphql API only worked for authenticated users
		if (!GitHubTokenManager.getInstance().getToken()) {
			const message = 'GraphQL API only worked for authenticated users';
			await GitHub1sAuthenticationView.getInstance().open(message, true);
		}
		return octokit.graphql(...args);
	}, octokit.graphql);
};

export class GitHubFetcher {
	private static instance: GitHubFetcher | null = null;

	public request: Octokit['request'];
	public graphql: Octokit['graphql'];

	private constructor() {
		initFetcherMethods(GitHubTokenManager.getInstance().getToken(), this);

		GitHubTokenManager.getInstance().onDidChangeToken(() => {
			initFetcherMethods(GitHubTokenManager.getInstance().getToken(), this);
		});
	}

	public static getInstance(): GitHubFetcher {
		if (GitHubFetcher.instance) {
			return GitHubFetcher.instance;
		}
		return (GitHubFetcher.instance = new GitHubFetcher());
	}
}
