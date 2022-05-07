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
	notFound: {
		anonymous: 'Repository not found, if it is private, you can provide an AccessToken to access it',
		authenticated: 'Repository not found, if it is private, you can try change an AccessToken to access it',
	},
	noPermission: {
		anonymous: 'You have no permission for this operation, please authenticate to github and retry',
		authenticated: 'You have no permission for this operation, please try another account',
	},
};

const detectErrorMessage = (response: any, authenticated: boolean, accessRepository: boolean) => {
	if (response?.status === 403 && +response?.headers?.['x-ratelimit-remaining'] === 0) {
		return errorMessages.rateLimited[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 401 && +response?.data?.message?.includes?.('Bad credentials')) {
		return errorMessages.badCredentials[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 404 && !accessRepository) {
		return errorMessages.notFound[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 403) {
		return errorMessages.noPermission[authenticated ? 'authenticated' : 'anonymous'];
	}
	return response?.data?.message || '';
};

const USE_SOURCEGRAPH_API_FIRST = 'USE_SOURCEGRAPH_API_FIRST';

export class GitHubFetcher {
	private static instance: GitHubFetcher | null = null;
	private _useSourcegraphApiFirst: boolean | null | undefined = null;
	private _emitter = new vscode.EventEmitter<boolean | null | undefined>();
	private _ownerAndRepoPromise: Promise<[string, string]> | null = null;
	private _foundRepositoryPromise: Promise<boolean> | null = null;
	private _originalRequest: Octokit['request'] | null = null;
	public onDidChangeUseSourcegraphApiFirst = this._emitter.event;

	public request: Octokit['request'];
	public graphql: Octokit['graphql'];

	private constructor() {
		this.initFetcherMethods();
		this.initUseSourcegraphApiFirst();

		GitHubTokenManager.getInstance().onDidChangeToken(() => {
			this.initFetcherMethods();
		});
	}

	private getOwnerAndRepo() {
		if (this._ownerAndRepoPromise) {
			return this._ownerAndRepoPromise;
		}
		return (this._ownerAndRepoPromise = new Promise(async (resolve) => {
			const browserUrl = (await vscode.commands.executeCommand('github1s.commands.vscode.getBrowserUrl')) as string;
			const [owner = 'conwnet', repo = 'github1s'] = vscode.Uri.parse(browserUrl).path.split('/').filter(Boolean);
			return resolve([owner, repo]);
		}));
	}

	private accessCurrentRepository() {
		if (this._foundRepositoryPromise) {
			return this._foundRepositoryPromise;
		}
		return (this._foundRepositoryPromise = new Promise(async (resolve) => {
			// check if current repository can be access
			const [owner, repo] = await this.getOwnerAndRepo();
			this._originalRequest?.('GET /repos/{owner}/{repo}', { owner, repo }).then(
				(response) => resolve(response.data.name ? true : false),
				() => resolve(false)
			);
		}));
	}

	// initial fetcher methods in this way for correct `request/graphql` type inference
	initFetcherMethods() {
		const accessToken = GitHubTokenManager.getInstance().getToken();
		const octokit = new Octokit({ auth: accessToken, request: { fetch } });

		this._originalRequest = octokit.request;
		this.request = Object.assign((...args: Parameters<Octokit['request']>) => {
			return octokit.request(...args).catch(async (error) => {
				const errorStatus = (error as any)?.response?.status;
				if ([401, 403, 404].includes(errorStatus)) {
					// maybe we have to acquire github access token to continue
					const accessRepository = await this.accessCurrentRepository();
					const message = detectErrorMessage(error?.response, !!accessToken, accessRepository);
					await GitHub1sAuthenticationView.getInstance().open(message, true);
					return octokit.request(...args);
				}
			});
		}, octokit.request);

		this.graphql = Object.assign(async (...args: Parameters<Octokit['graphql']>) => {
			// graphql API only worked for authenticated users
			if (!GitHubTokenManager.getInstance().getToken()) {
				const message = 'GraphQL API only worked for authenticated users';
				await GitHub1sAuthenticationView.getInstance().open(message, true);
			}
			return octokit.graphql(...args);
		}, octokit.graphql);
	}

	private async initUseSourcegraphApiFirst() {
		if (this.useSourcegraphApiFirst()) {
			// if sourcegraph api can not found current repository,
			// then mark use github api for this repository
			SourcegraphDataSource.getInstance('github')
				.provideRepository((await this.getOwnerAndRepo()).join('/'))
				.then((repository) => !repository && this.setUseSourcegraphApiFirst(false));
		}
	}

	public useSourcegraphApiFirst(): boolean {
		if (!isNil(this._useSourcegraphApiFirst)) {
			return this._useSourcegraphApiFirst!;
		}

		const workspaceState = getExtensionContext().workspaceState;
		this._useSourcegraphApiFirst = workspaceState.get(USE_SOURCEGRAPH_API_FIRST);

		if (!isNil(this._useSourcegraphApiFirst)) {
			return this._useSourcegraphApiFirst!;
		}

		return (this._useSourcegraphApiFirst = true);
	}

	public setUseSourcegraphApiFirst(value: boolean | null | undefined) {
		this._useSourcegraphApiFirst = value;
		getExtensionContext().workspaceState.update(USE_SOURCEGRAPH_API_FIRST, value);
		this._emitter.fire(value);
	}

	public static getInstance(): GitHubFetcher {
		if (GitHubFetcher.instance) {
			return GitHubFetcher.instance;
		}
		return (GitHubFetcher.instance = new GitHubFetcher());
	}
}
