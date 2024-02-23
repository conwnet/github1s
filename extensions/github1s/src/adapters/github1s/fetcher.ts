/**
 * @file github api fetcher base octokit
 * @author netcon
 */

(self as any).global = self;
import * as vscode from 'vscode';
import { getBrowserUrl, getExtensionContext } from '@/helpers/context';
import { Octokit } from '@octokit/core';
import { GitHub1sAuthenticationView } from './authentication';
import { GitHubTokenManager } from './token';
import { isNil } from '@/helpers/util';
import { decorate, memorize } from '@/helpers/func';
import { DEFAULT_REPO } from './parse-path';

export const errorMessages = {
	rateLimited: {
		anonymous: 'API Rate Limit Exceeded, please authenticate to github and retry',
		authenticated: 'API Rate Limit Exceeded for this token, please try another account',
	},
	badCredentials: {
		anonymous: 'Bad credentials, please authenticate to github and retry',
		authenticated: 'This token is invalid, please try another one',
	},
	repoNotFound: {
		anonymous: 'Repository not found, if it is private, you can provide an AccessToken to access it',
		authenticated: 'Repository not found, if it is private, you can try change an AccessToken to access it',
	},
	noPermission: {
		anonymous: 'You have no permission for this operation, please authenticate to github and retry',
		authenticated: 'You have no permission for this operation, please try another account',
	},
};

const detectErrorMessage = (response: any, authenticated: boolean) => {
	if (response?.status === 403 && +response?.headers?.['x-ratelimit-remaining'] === 0) {
		return errorMessages.rateLimited[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 401 && response?.data?.message?.includes?.('Bad credentials')) {
		return errorMessages.badCredentials[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 404) {
		return errorMessages.repoNotFound[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 403) {
		return errorMessages.noPermission[authenticated ? 'authenticated' : 'anonymous'];
	}
	return response?.data?.message || '';
};

const USE_SOURCEGRAPH_API_FIRST = 'USE_SOURCEGRAPH_API_FIRST';

export class GitHubFetcher {
	private static instance: GitHubFetcher | null = null;
	private _emitter = new vscode.EventEmitter<boolean | null | undefined>();
	private _originalRequest: Octokit['request'] | null = null;
	public onDidChangeUseSourcegraphApiFirst = this._emitter.event;
	private _currentRepoPromise: Promise<any> | null = null;

	public request: Octokit['request'];
	public graphql: Octokit['graphql'];

	public static getInstance(): GitHubFetcher {
		if (GitHubFetcher.instance) {
			return GitHubFetcher.instance;
		}
		return (GitHubFetcher.instance = new this());
	}

	private constructor() {
		this.initFetcherMethods();
		GitHubTokenManager.getInstance().onDidChangeToken(() => this.initFetcherMethods());
		GitHubTokenManager.getInstance().onDidChangeToken(() => this.checkCurrentRepo(true));
	}

	// initial fetcher methods in this way for correct `request/graphql` type inference
	initFetcherMethods() {
		const accessToken = GitHubTokenManager.getInstance().getToken();
		const octokit = new Octokit({ auth: accessToken, request: { fetch }, baseUrl: GITHUB_API_PREFIX });

		this._originalRequest = octokit.request;
		this.request = Object.assign((...args: Parameters<Octokit['request']>) => {
			return octokit.request(...args).catch(async (error) => {
				const errorStatus = error?.response?.status as number | undefined;
				const repoNotFound = errorStatus === 404 && !(await this.checkCurrentRepo());
				if ((errorStatus && [401, 403].includes(errorStatus)) || repoNotFound) {
					// maybe we have to acquire github access token to continue
					const message = detectErrorMessage(error?.response, !!accessToken);
					await GitHub1sAuthenticationView.getInstance().open(message, true);
					return this._originalRequest!(...args);
				}
			});
		}, this._originalRequest);

		this.graphql = Object.assign(async (...args: Parameters<Octokit['graphql']>) => {
			if (!GitHubTokenManager.getInstance().getToken()) {
				const message = 'GraphQL API only works for authenticated users';
				await GitHub1sAuthenticationView.getInstance().open(message, true);
			}
			return octokit.graphql(...args);
		}, octokit.graphql);
	}

	@decorate(memorize)
	private getCurrentRepo() {
		return getBrowserUrl().then((browserUrl: string) => {
			const pathParts = vscode.Uri.parse(browserUrl).path.split('/').filter(Boolean);
			return pathParts.length >= 2 ? (pathParts.slice(0, 2) as [string, string]).join('/') : DEFAULT_REPO;
		});
	}

	private checkCurrentRepo(forceUpdate: boolean = false) {
		if (this._currentRepoPromise && !forceUpdate) {
			return this._currentRepoPromise;
		}
		return (this._currentRepoPromise = Promise.resolve(this.getCurrentRepo()).then(async (repoFullName) => {
			const [owner, repo] = repoFullName.split('/');
			const response = await this._originalRequest?.('GET /repos/{owner}/{repo}', { owner, repo });
			response?.data?.private && (await this.setUseSourcegraphApiFirst(false));
			return response?.data || null;
		})).catch(() => null);
	}

	public async useSourcegraphApiFirst(repo?: string): Promise<boolean> {
		const targetRepo = repo || (await this.getCurrentRepo());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		return !isNil(cachedData?.[targetRepo]) ? !!cachedData?.[targetRepo] : true;
	}

	public async setUseSourcegraphApiFirst(value: boolean, repo?: string) {
		const targetRepo = repo || (await this.getCurrentRepo());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		await globalState.update(USE_SOURCEGRAPH_API_FIRST, { ...cachedData, [targetRepo]: value });
		this._emitter.fire(value);
	}
}
