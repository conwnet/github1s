/**
 * @file github api auth token manager
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';

const GITHUB_OAUTH_TOKEN = 'github-oauth-token';

export interface TokenStatus {
	ratelimitLimit: number;
	ratelimitRemaining: number;
	ratelimitReset: number;
	ratelimitResource: number;
	ratelimitUsed: number;
}

export class GitHubTokenManager {
	private static instance: GitHubTokenManager | null = null;
	private _emitter = new vscode.EventEmitter<string>();
	public onDidChangeToken = this._emitter.event;

	private constructor() {}
	public static getInstance(): GitHubTokenManager {
		if (GitHubTokenManager.instance) {
			return GitHubTokenManager.instance;
		}
		return (GitHubTokenManager.instance = new GitHubTokenManager());
	}

	public getToken(): string {
		return getExtensionContext().globalState.get(GITHUB_OAUTH_TOKEN) || '';
	}

	public setToken(token: string) {
		return getExtensionContext()
			.globalState.update(GITHUB_OAUTH_TOKEN, token)
			.then(() => this._emitter.fire(token));
	}

	public async validateToken(token?: string): Promise<TokenStatus | null> {
		const accessToken = token === undefined ? this.getToken() : token;
		const fetchOptions = accessToken ? { headers: { Authorization: `token ${accessToken}` } } : {};
		return fetch('https://api.github.com', fetchOptions)
			.then((response) => {
				if (response.status === 401) {
					return null;
				}
				return {
					ratelimitLimit: +response.headers.get('x-ratelimit-limit')! || 0,
					ratelimitRemaining: +response.headers.get('x-ratelimit-remaining')! || 0,
					ratelimitReset: +response.headers.get('x-ratelimit-reset')! || 0,
					ratelimitResource: +response.headers.get('ratelimit-resource')! || 0,
					ratelimitUsed: +response.headers.get('x-ratelimit-used')! || 0,
				};
			})
			.catch(() => null);
	}
}
