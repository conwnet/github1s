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

const detectErrorMessage = (response: any, authenticated: boolean) => {
	if (response?.status === 401 && response?.data?.message?.includes?.('Unauthorized')) {
		return errorMessages.badCredentials[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 404) {
		return errorMessages.repoNotFound[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 403) {
		return errorMessages.noPermission[authenticated ? 'authenticated' : 'anonymous'];
	}
	return response?.data?.message || response?.data?.error || '';
};

const USE_SOURCEGRAPH_API_FIRST = 'USE_SOURCEGRAPH_API_FIRST';

export class GitLabFetcher {
	private static instance: GitLabFetcher | null = null;
	private _emitter = new vscode.EventEmitter<boolean | null | undefined>();
	public onDidChangeUseSourcegraphApiFirst = this._emitter.event;
	private _currentRepoPromise: Promise<any> | null = null;

	public static getInstance(): GitLabFetcher {
		if (GitLabFetcher.instance) {
			return GitLabFetcher.instance;
		}
		return (GitLabFetcher.instance = new GitLabFetcher());
	}

	private constructor() {
		GitLabTokenManager.getInstance().onDidChangeToken(() => this.checkCurrentRepo(true));
	}

	private _originalRequest = reuseable(
		(
			command: string,
			params: Record<string, string | number | boolean | undefined>
		): Promise<{ status: number; data: any; headers: Headers }> => {
			let [method, path] = command.split(/\s+/).filter(Boolean);
			Object.keys(params).forEach((el) => {
				path = path.replace(`{${el}}`, `${encodeURIComponent(params[el] || '')}`);
			});
			const accessToken = GitLabTokenManager.getInstance().getToken();
			const fetchOptions: { headers: Record<string, string> } =
				accessToken?.length < 60
					? { headers: { 'PRIVATE-TOKEN': `${accessToken}` } }
					: { headers: { Authorization: `Bearer ${accessToken}` } };
			return fetch(GITLAB_API_PREFIX + path, {
				...fetchOptions,
				method,
			}).then(async (response: Response & { data: any }) => {
				response.data = await response.json();
				return response.ok ? response : Promise.reject({ response });
			});
		}
	);

	public request = (command: string, params: Record<string, string | number | boolean | undefined>) => {
		return this._originalRequest(command, params).catch(async (error: { response: any }) => {
			const errorStatus = error?.response?.status as number | undefined;
			const repoNotFound = errorStatus === 404 && !(await this.checkCurrentRepo());
			if ((errorStatus && [401, 403].includes(errorStatus)) || repoNotFound) {
				// maybe we have to acquire github access token to continue
				const accessToken = GitLabTokenManager.getInstance().getToken();
				const message = detectErrorMessage(error?.response, !!accessToken);
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

	private checkCurrentRepo(forceUpdate: boolean = false) {
		if (this._currentRepoPromise && !forceUpdate) {
			return this._currentRepoPromise;
		}
		return (this._currentRepoPromise = Promise.resolve(this.getCurrentRepo()).then(async (repo) => {
			const response = await this._originalRequest('GET /projects/{repo}', { repo });
			response?.data?.visibility === 'private' && this.setUseSourcegraphApiFirst(false);
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
