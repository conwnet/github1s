/**
 * @file github api auth token manager
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';

export interface ValidateResult {
	username: string;
	avatar_url: string;
	profile_url: string;
	ratelimits?: {
		limit?: number;
		remaining?: number;
		reset?: number;
		resource?: number;
		used?: number;
	};
}

export class GitHubTokenManager {
	protected static instance: GitHubTokenManager | null = null;
	private _emitter = new vscode.EventEmitter<string>();
	public onDidChangeToken = this._emitter.event;
	public tokenStateKey = 'github-oauth-token';

	protected constructor() {}
	public static getInstance(): GitHubTokenManager {
		if (GitHubTokenManager.instance) {
			return GitHubTokenManager.instance;
		}
		return (GitHubTokenManager.instance = new this());
	}

	public getToken(): string {
		return getExtensionContext().globalState.get(this.tokenStateKey) || '';
	}

	public async setToken(token: string) {
		const isTokenChanged = this.getToken() !== token;
		return getExtensionContext()
			.globalState.update(this.tokenStateKey, token)
			.then(() => isTokenChanged && this._emitter.fire(token));
	}

	public async validateToken(token?: string): Promise<ValidateResult | null> {
		const accessToken = token === undefined ? this.getToken() : token;
		if (!accessToken) {
			return Promise.resolve(null);
		}
		const fetchOptions = accessToken ? { headers: { Authorization: `token ${accessToken}` } } : {};
		return fetch(`${GITHUB_API_PREFIX}/user`, fetchOptions)
			.then((response) => {
				if (response.status === 401) {
					return null;
				}
				return response.json().then((data) => ({
					username: data.login,
					avatar_url: data.avatar_url,
					profile_url: data.html_url,
					rateLimits: {
						limit: +response.headers.get('x-ratelimit-limit')! || 0,
						remaining: +response.headers.get('x-ratelimit-remaining')! || 0,
						reset: +response.headers.get('x-ratelimit-reset')! || 0,
						resource: +response.headers.get('ratelimit-resource')! || 0,
						used: +response.headers.get('x-ratelimit-used')! || 0,
					},
				}));
			})
			.catch(() => null);
	}
}
