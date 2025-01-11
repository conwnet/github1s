/**
 * @file gitlab api fetcher
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { GitLab1sAuthenticationView } from './authentication';
import { GitLabTokenManager } from './token';
import { isNil } from '@/helpers/util';
import { reuseable } from '@/helpers/func';
import { getCurrentRepo } from './parse-path';
import { SourcegraphDataSource } from '../sourcegraph/data-source';

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

const PREFER_SOURCEGRAPH_API = 'PREFER_SOURCEGRAPH_API';

export class GitLabFetcher {
	private static instance: GitLabFetcher | null = null;
	private _emitter = new vscode.EventEmitter<boolean | null | undefined>();
	public onDidChangePreferSourcegraphApi = this._emitter.event;
	private _currentRepoPromise: Promise<any> | null = null;

	public static getInstance(): GitLabFetcher {
		if (GitLabFetcher.instance) {
			return GitLabFetcher.instance;
		}
		return (GitLabFetcher.instance = new GitLabFetcher());
	}

	private constructor() {
		this.initPreferSourcegraphApi();
		GitLabTokenManager.getInstance().onDidChangeToken(() => this.initPreferSourcegraphApi());
	}

	private _request = reuseable(
		(
			command: string,
			params: Record<string, string | number | boolean | undefined>,
		): Promise<{ status: number; data: any; headers: Headers }> => {
			// eslint-disable-next-line prefer-const
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
		},
	);

	public request = (command: string, params: Record<string, string | number | boolean | undefined>) => {
		return this._request(command, params).catch(async (error: { response: any }) => {
			const errorStatus = error?.response?.status as number | undefined;
			const repoNotFound = errorStatus === 404 && !(await this.resolveCurrentRepo());
			if ((errorStatus && [401, 403].includes(errorStatus)) || repoNotFound) {
				// maybe we have to acquire github access token to continue
				const accessToken = GitLabTokenManager.getInstance().getToken();
				const message = detectErrorMessage(error?.response, !!accessToken);
				await GitLab1sAuthenticationView.getInstance().open(message, true);
				return this._request(command, params);
			}
			throw error;
		});
	};

	private resolveCurrentRepo(forceUpdate: boolean = false) {
		if (this._currentRepoPromise && !forceUpdate) {
			return this._currentRepoPromise;
		}
		return (this._currentRepoPromise = Promise.resolve(getCurrentRepo())
			.then(async (repo) => this._request('GET /projects/{repo}', { repo }).then((res) => res.data))
			.catch(() => null));
	}

	private async initPreferSourcegraphApi() {
		if (await this.getPreferSourcegraphApi()) {
			const sgDataSource = SourcegraphDataSource.getInstance('github');
			if (!(await sgDataSource.provideRepository(await getCurrentRepo()))) {
				this.resolveCurrentRepo(true).then((repo) => {
					repo?.visibility === 'private' && this.setPreferSourcegraphApi(false);
				});
			}
		}
	}

	public async getPreferSourcegraphApi(repo?: string): Promise<boolean> {
		const targetRepo = repo || (await getCurrentRepo());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(PREFER_SOURCEGRAPH_API);
		return !isNil(cachedData?.[targetRepo]) ? !!cachedData?.[targetRepo] : true;
	}

	public async setPreferSourcegraphApi(value: boolean, repo?: string) {
		const targetRepo = repo || (await getCurrentRepo());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(PREFER_SOURCEGRAPH_API);
		await globalState.update(PREFER_SOURCEGRAPH_API, { ...cachedData, [targetRepo]: value });
		this._emitter.fire(value);
	}
}
