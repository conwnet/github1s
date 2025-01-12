/**
 * @file github api fetcher base octokit
 * @author netcon
 */

(self as any).global = self;
import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { Octokit } from '@octokit/core';
import { GitHub1sAuthenticationView } from './authentication';
import { GitHubTokenManager } from './token';
import { isNil } from '@/helpers/util';
import { getCurrentRepo } from './parse-path';
import { SourcegraphDataSource } from '../sourcegraph/data-source';

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

const PREFER_SOURCEGRAPH_API = 'PREFER_SOURCEGRAPH_API';

export class GitHubFetcher {
	private static instance: GitHubFetcher | null = null;
	private _emitter = new vscode.EventEmitter<boolean | null | undefined>();
	private _request: Octokit['request'] | null = null;
	public onDidChangePreferSourcegraphApi = this._emitter.event;
	private _currentRepoPromise: Promise<any> | null = null;
	private _sgApiTimeout: boolean = false;

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
		this.initPreferSourcegraphApi();
		GitHubTokenManager.getInstance().onDidChangeToken(() => this.initFetcherMethods());
		GitHubTokenManager.getInstance().onDidChangeToken(() => this.initPreferSourcegraphApi());
	}

	// initial fetcher methods in this way for correct `request/graphql` type inference
	initFetcherMethods() {
		const accessToken = GitHubTokenManager.getInstance().getToken();
		const octokit = new Octokit({ auth: accessToken, request: { fetch }, baseUrl: GITHUB_API_PREFIX });

		this._request = octokit.request;
		this.request = Object.assign((...args: Parameters<Octokit['request']>) => {
			return octokit.request(...args).catch(async (error) => {
				const errorStatus = error?.response?.status as number | undefined;
				const repoNotFound = errorStatus === 404 && !(await this.resolveCurrentRepo());
				if ((errorStatus && [401, 403].includes(errorStatus)) || repoNotFound) {
					// maybe we have to acquire github access token to continue
					const message = detectErrorMessage(error?.response, !!accessToken);
					await GitHub1sAuthenticationView.getInstance().open(message, true);
					return this._request!(...args);
				}
			});
		}, this._request);

		this.graphql = Object.assign(async (...args: Parameters<Octokit['graphql']>) => {
			if (!GitHubTokenManager.getInstance().getToken()) {
				const message = 'GraphQL API only works for authenticated users';
				await GitHub1sAuthenticationView.getInstance().open(message, true);
			}
			return octokit.graphql(...args);
		}, octokit.graphql);
	}

	private resolveCurrentRepo(forceUpdate: boolean = false) {
		if (this._currentRepoPromise && !forceUpdate) {
			return this._currentRepoPromise;
		}
		const requestPattern = '/repos/{owner}/{repo}' as const;
		const getOwnerRepo = () => getCurrentRepo().then((repo) => repo.split('/'));
		return (this._currentRepoPromise = Promise.resolve(getOwnerRepo())
			.then(([owner, repo]) => this._request?.(requestPattern, { owner, repo }).then((res) => res.data))
			.catch(() => null));
	}

	private async initPreferSourcegraphApi() {
		if (await this.getPreferSourcegraphApi()) {
			const sgDataSource = SourcegraphDataSource.getInstance('github');
			try {
				if (!(await sgDataSource.provideRepository(await getCurrentRepo()))) {
					this.resolveCurrentRepo(true).then((repo) => {
						repo?.private && this.setPreferSourcegraphApi(false);
					});
				}
			} catch (e) {
				if (e.message && e.message.includes('signal is aborted')) {
					this._sgApiTimeout = true;
				}
			}
		}
	}

	public async getPreferSourcegraphApi(repo?: string): Promise<boolean> {
		const targetRepo = repo || (await getCurrentRepo());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(PREFER_SOURCEGRAPH_API);
		return !isNil(cachedData?.[targetRepo]) ? !!cachedData?.[targetRepo] : this._sgApiTimeout ? false : true;
	}

	public async setPreferSourcegraphApi(value: boolean, repo?: string) {
		const targetRepo = repo || (await getCurrentRepo());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(PREFER_SOURCEGRAPH_API);
		await globalState.update(PREFER_SOURCEGRAPH_API, { ...cachedData, [targetRepo]: value });
		this._emitter.fire(value);
	}
}
