/**
 * @file gitlab api fetcher
 * @author netcon
 */

import * as vscode from 'vscode';
import { getBrowserUrl, getExtensionContext } from '@/helpers/context';
import { GitLab1sAuthenticationView } from './authentication';
import { GitLabTokenManager } from './token';
import { isNil } from '@/helpers/util';
import { decorate, memorize, reuseable } from '@/helpers/func';
import { DEFAULT_REPO } from './parse-path';

export const errorMessages = {
	badCredentials: {
		anonymous: 'Bad credentials, please authenticate to gitlab and retry',
		authenticated: 'This token is invalid, please try another one',
	},
	repoNotFound: {
		anonymous: 'Repository not found, if it is private, you can provide an AccessToken to access it',
		authenticated: 'Repository not found, if it is private, you can try change an AccessToken to access it',
	},
	noPermission: {
		anonymous: 'You have no permission for this operation, please authenticate to gitlab and retry',
		authenticated: 'You have no permission for this operation, please try another account',
	},
};

const detectErrorMessage = (error: { status: number; data: any }, authenticated: boolean) => {
	if (error?.status === 401 && +error?.data?.message?.includes?.('Unauthorized')) {
		return errorMessages.badCredentials[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (error?.status === 404) {
		return errorMessages.repoNotFound[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (error?.status === 403) {
		return errorMessages.noPermission[authenticated ? 'authenticated' : 'anonymous'];
	}
	return error?.data?.message || error?.data?.error || '';
};

const USE_SOURCEGRAPH_API_FIRST = 'USE_SOURCEGRAPH_API_FIRST';

export class GitLabFetcher {
	private static instance: GitLabFetcher | null = null;
	private _emitter = new vscode.EventEmitter<boolean | null | undefined>();
	public onDidChangeUseSourcegraphApiFirst = this._emitter.event;

	public static getInstance(): GitLabFetcher {
		if (GitLabFetcher.instance) {
			return GitLabFetcher.instance;
		}
		return (GitLabFetcher.instance = new GitLabFetcher());
	}

	private _originalRequest = reuseable(
		(
			command: string,
			params: Record<string, string | number | boolean | undefined>
		): Promise<{ status: number; data: any; headers: Headers }> => {
			let [method, url] = command.split(' ');
			Object.keys(params).forEach((el) => {
				url = url.replace(`{${el}}`, `${encodeURIComponent(params[el] || '')}`);
			});
			const accessToken = GitLabTokenManager.getInstance().getToken();
			const fetchOptions: { headers: Record<string, string> } =
				accessToken?.length < 60
					? { headers: { 'PRIVATE-TOKEN': `${accessToken}` } }
					: { headers: { Authorization: `Bearer ${accessToken}` } };
			return fetch(`${GITLAB_DOMAIN}/api/v4` + url, {
				...fetchOptions,
				method,
			}).then(async (response) => {
				const data = { status: response.status, data: await response.json(), headers: response.headers };
				return response.ok ? data : Promise.reject(data);
			});
		}
	);

	public request = (command: string, params: Record<string, string | number | boolean | undefined>) => {
		return this._originalRequest(command, params).catch(async (error?: { status: number; data: any }) => {
			const repoNotFound = error && error.status === 404 && !(await this.checkCurrentRepo());
			if ((error && [401, 403].includes(error.status)) || repoNotFound) {
				// maybe we have to acquire github access token to continue
				const accessToken = GitLabTokenManager.getInstance().getToken();
				const message = detectErrorMessage(error, !!accessToken);
				await GitLab1sAuthenticationView.getInstance().open(message, true);
				return this._originalRequest(command, params);
			}
			throw error;
		});
	};

	@decorate(memorize)
	private getCurrentRepo() {
		return getBrowserUrl().then((browserUrl: string) => {
			const pathParts = vscode.Uri.parse(browserUrl).path.split('/').filter(Boolean);
			return pathParts.length >= 2 ? (pathParts.slice(0, 2) as [string, string]).join('/') : DEFAULT_REPO;
		});
	}

	@decorate(memorize)
	private async checkCurrentRepo() {
		const [owner, repo] = (await this.getCurrentRepo()).split('/');
		return this._originalRequest?.('GET /repos/{owner}/{repo}', { owner, repo }).then(
			(response) => {
				// turn off `useSourcegraphApiFirst` if current repository is private
				response?.data?.private && this.setUseSourcegraphApiFirst(false);
				return response?.data || null;
			},
			() => null
		);
	}

	public async useSourcegraphApiFirst(repoFullName?: string): Promise<boolean> {
		const targetRepo = repoFullName || (await this.getCurrentRepo());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		return !isNil(cachedData?.[targetRepo]) ? !!cachedData?.[targetRepo] : true;
	}

	public async setUseSourcegraphApiFirst(repoOrValue: string | boolean, value?: boolean) {
		const targetRepo = !isNil(value) ? (repoOrValue as string) : await this.getCurrentRepo();
		const targetValue = !isNil(value) ? value : !!repoOrValue;
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		await globalState.update(USE_SOURCEGRAPH_API_FIRST, { ...cachedData, [targetRepo]: targetValue });
		this._emitter.fire(value);
	}
}
