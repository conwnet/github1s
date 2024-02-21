/**
 * @file gitlab api fetcher base gitbeaker
 * @author netcon
 */

(self as any).global = self;
import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { GitLab1sAuthenticationView } from './authentication';
import { GitLabTokenManager } from './token';
import { isNil } from '@/helpers/util';
import { SourcegraphDataSource } from '../sourcegraph/data-source';
import { reuseable } from '@/helpers/func';

export const errorMessages = {
	badCredentials: {
		anonymous: 'Bad credentials, please authenticate to gitlab and retry',
		authenticated: 'This token is invalid, please try another one',
	},
	notFound: {
		anonymous: 'Repository not found, if it is private, you can provide an AccessToken to access it',
		authenticated: 'Repository not found, if it is private, you can try change an AccessToken to access it',
	},
	noPermission: {
		anonymous: 'You have no permission for this operation, please authenticate to gitlab and retry',
		authenticated: 'You have no permission for this operation, please try another account',
	},
};

const detectErrorMessage = (response: any, authenticated: boolean, accessRepository: boolean) => {
	if (response?.status === 401 && +response?.data?.message?.includes?.('Unauthorized')) {
		return errorMessages.badCredentials[authenticated ? 'authenticated' : 'anonymous'];
	}
	if (response?.status === 404 && !accessRepository) {
		return errorMessages.notFound[authenticated ? 'authenticated' : 'anonymous'];
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
	private _repoNamePromise: Promise<string> | null = null;
	private _repositoryPromise: Promise<{ private: boolean } | null> | null = null;
	public onDidChangeUseSourcegraphApiFirst = this._emitter.event;

	public static getInstance(): GitLabFetcher {
		if (GitLabFetcher.instance) {
			return GitLabFetcher.instance;
		}
		return (GitLabFetcher.instance = new GitLabFetcher());
	}

	private constructor() {
		// this.initFetcherMethods();
		// turn off `useSourcegraphApiFirst` if current repository is private
		this.useSourcegraphApiFirst().then((useSourcegraphApiFirst) =>
			this.resolveCurrentRepository(useSourcegraphApiFirst).then(
				(repository) => repository?.private && !this.setUseSourcegraphApiFirst(false)
			)
		);
		// GitLabTokenManager.getInstance().onDidChangeToken(() => this.initFetcherMethods());
	}

	private _request = reuseable((command: string, params: Record<string, string | number | boolean | undefined>) => {
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
	});

	public request = (command: string, params: Record<string, string | number | boolean | undefined>) => {
		return this._request(command, params).catch(async (error) => {
			const errorStatus = (error as any)?.status;
			if ([401, 403, 404].includes(errorStatus)) {
				// maybe we have to acquire gitlab access token to continue
				const repository = await this.resolveCurrentRepository(false);
				const accessToken = GitLabTokenManager.getInstance().getToken();
				const message = detectErrorMessage(error, !!accessToken, !!repository);
				await GitLab1sAuthenticationView.getInstance().open(message, true);
				return this._request(command, params);
			}
		});
	};

	private getCurrentRepoName() {
		if (this._repoNamePromise) {
			return this._repoNamePromise;
		}
		return (this._repoNamePromise = new Promise((resolve) => {
			return vscode.commands.executeCommand('github1s.commands.vscode.getBrowserUrl').then(
				(browserUrl: string) => {
					const pathParts = vscode.Uri.parse(browserUrl).path.split('/').filter(Boolean);
					const dashIndex = pathParts.indexOf('-');
					const repoParts = dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex);
					resolve(pathParts.length >= 2 ? repoParts.join('/') : 'conwnet/github1s');
				},
				() => resolve('conwnet/github1s')
			);
		}));
	}

	private resolveCurrentRepository(useSourcegraphApiFirst: boolean) {
		if (this._repositoryPromise) {
			return this._repositoryPromise;
		}
		return (this._repositoryPromise = new Promise(async (resolve) => {
			const repoName = await this.getCurrentRepoName();
			const dataSource = SourcegraphDataSource.getInstance('gitlab');
			if (useSourcegraphApiFirst && !!(await dataSource.provideRepository(repoName).catch((e) => false))) {
				return resolve({ private: false });
			}
			return this.request?.(`GET /projects/{repo}`, { repo: repoName }).then(
				(response) => resolve({ private: response?.data?.visibility === 'private' }),
				() => resolve(null)
			);
		}));
	}

	public async useSourcegraphApiFirst(repoFullName?: string): Promise<boolean> {
		const targetRepo = repoFullName || (await this.getCurrentRepoName());
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		return !isNil(cachedData?.[targetRepo]) ? !!cachedData?.[targetRepo] : true;
	}

	public async setUseSourcegraphApiFirst(repoOrValue: string | boolean, value?: boolean) {
		const targetRepo = !isNil(value) ? (repoOrValue as string) : await this.getCurrentRepoName();
		const targetValue = !isNil(value) ? value : !!repoOrValue;
		const globalState = getExtensionContext().globalState;
		const cachedData: Record<string, boolean> | undefined = globalState.get(USE_SOURCEGRAPH_API_FIRST);
		await globalState.update(USE_SOURCEGRAPH_API_FIRST, { ...cachedData, [targetRepo]: targetValue });
		this._emitter.fire(value);
	}
}
