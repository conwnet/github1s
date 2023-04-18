/**
 * @file github api fetcher base octokit
 * @author netcon
 * @updated by kcoms555 for Enterprise
 */

import { ConfigsForEnterprise } from '../../../../../platform_config';

(self as any).global = self;
import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { Octokit } from '@octokit/core';
import { GitHubEnterprise1sAuthenticationView } from './authentication';
import { GitHubEnterpriseTokenManager } from './token';
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

export class GitHubEnterpriseFetcher {
	private static instance: GitHubEnterpriseFetcher | null = null;
	private _emitter = new vscode.EventEmitter<boolean | null | undefined>();
	private _ownerAndRepoPromise: Promise<[string, string]> | null = null;
	private _repositoryPromise: Promise<{ private: boolean } | null> | null = null;
	private _originalRequest: Octokit['request'] | null = null;
	public onDidChangeUseSourcegraphApiFirst = this._emitter.event;

	public request: Octokit['request'];
	public graphql: Octokit['graphql'];

	public static getInstance(): GitHubEnterpriseFetcher {
		if (GitHubEnterpriseFetcher.instance) {
			return GitHubEnterpriseFetcher.instance;
		}
		return (GitHubEnterpriseFetcher.instance = new GitHubEnterpriseFetcher());
	}

	private constructor() {
		this.initFetcherMethods();
		// turn off `useSourcegraphApiFirst` if current repository is private
		this.useSourcegraphApiFirst().then((useSourcegraphApiFirst) =>
			this.resolveCurrentRepository(useSourcegraphApiFirst).then(
				(repository) => repository?.private && !this.setUseSourcegraphApiFirst(false)
			)
		);
		GitHubEnterpriseTokenManager.getInstance().onDidChangeToken(() => this.initFetcherMethods());
	}

	// initial fetcher methods in this way for correct `request/graphql` type inference
	initFetcherMethods() {
		const accessToken = GitHubEnterpriseTokenManager.getInstance().getToken();
		const octokit = new Octokit({
			auth: accessToken,
			request: { fetch },
			baseUrl: ConfigsForEnterprise.github_enterprise_api_url,
		});

		this._originalRequest = octokit.request;
		this.request = Object.assign((...args: Parameters<Octokit['request']>) => {
			return octokit.request(...args).catch(async (error) => {
				const errorStatus = (error as any)?.response?.status;
				if ([401, 403, 404].includes(errorStatus)) {
					// maybe we have to acquire github access token to continue
					const repository = await this.resolveCurrentRepository(false);
					const message = detectErrorMessage(error?.response, !!accessToken, !!repository);
					await GitHubEnterprise1sAuthenticationView.getInstance().open(message, true);
					return octokit.request(...args);
				}
			});
		}, octokit.request);

		this.graphql = Object.assign(async (...args: Parameters<Octokit['graphql']>) => {
			// graphql API only worked for authenticated users
			if (!GitHubEnterpriseTokenManager.getInstance().getToken()) {
				const message = 'GraphQL API only worked for authenticated users';
				await GitHubEnterprise1sAuthenticationView.getInstance().open(message, true);
			}
			return octokit.graphql(...args);
		}, octokit.graphql);
	}

	private getCurrentOwnerAndRepo() {
		if (this._ownerAndRepoPromise) {
			return this._ownerAndRepoPromise;
		}
		return (this._ownerAndRepoPromise = new Promise((resolve) => {
			return vscode.commands.executeCommand('github1s.commands.vscode.getBrowserUrl').then(
				(browserUrl: string) => {
					const pathParts = vscode.Uri.parse(browserUrl).path.split('/').filter(Boolean);
					resolve(pathParts.length >= 2 ? (pathParts.slice(0, 2) as [string, string]) : ['kcoms555', 'github1s']);
				},
				() => resolve(['kcoms555', 'github1s'])
			);
		}));
	}

	private resolveCurrentRepository(useSourcegraphApiFirst: boolean) {
		if (this._repositoryPromise) {
			return this._repositoryPromise;
		}
		return (this._repositoryPromise = new Promise(async (resolve) => {
			const [owner = 'kcoms555', repo = 'github1s'] = await this.getCurrentOwnerAndRepo();
			const dataSource = SourcegraphDataSource.getInstance('github-enterprise');
			if (useSourcegraphApiFirst && !!(await dataSource.provideRepository(`${owner}/${repo}`))) {
				return resolve({ private: false });
			}
			return this._originalRequest?.('GET /repos/{owner}/{repo}', { owner, repo }).then(
				(response) => resolve(response?.data || null),
				() => resolve(null)
			);
		}));
	}

	public async useSourcegraphApiFirst(repoFullName?: string): Promise<boolean> {
		const targetRepo = repoFullName || (await this.getCurrentOwnerAndRepo()).join('/');
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		return !isNil(cachedData?.[targetRepo]) ? !!cachedData?.[targetRepo] : true;
	}

	public async setUseSourcegraphApiFirst(repoOrValue: string | boolean, value?: boolean) {
		const targetRepo = !isNil(value) ? (repoOrValue as string) : (await this.getCurrentOwnerAndRepo()).join('/');
		const targetValue = !isNil(value) ? value : !!repoOrValue;
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		await globalState.update(USE_SOURCEGRAPH_API_FIRST, { ...cachedData, [targetRepo]: targetValue });
		this._emitter.fire(value);
	}
}
