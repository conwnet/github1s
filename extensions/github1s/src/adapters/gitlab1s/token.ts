/**
 * @file github api auth token manager
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';

const GITLAB_OAUTH_TOKEN = 'gitlab-oauth-token';

export interface TokenStatus {
	ratelimitLimit: number;
	ratelimitRemaining: number;
	ratelimitReset: number;
	ratelimitResource: number;
	ratelimitUsed: number;
}

export class GitLabTokenManager {
	private static instance: GitLabTokenManager | null = null;
	private _emitter = new vscode.EventEmitter<string>();
	public onDidChangeToken = this._emitter.event;

	private constructor() {}
	public static getInstance(): GitLabTokenManager {
		if (GitLabTokenManager.instance) {
			return GitLabTokenManager.instance;
		}
		return (GitLabTokenManager.instance = new GitLabTokenManager());
	}

	public getToken(): string {
		return getExtensionContext().globalState.get(GITLAB_OAUTH_TOKEN) || '';
	}

	public getHeader(token?: string): Record<string, Record<string, string>> {
		const accessToken = token === undefined ? this.getToken() : token;
		if (!accessToken) {
			return {};
		}
		if (accessToken.length >= 60) {
			return { headers: { Authorization: `Bearer ${accessToken}` } };
		}
		return { headers: { 'PRIVATE-TOKEN': `${accessToken}` } };
	}

	public async setToken(token: string) {
		const isTokenChanged = this.getToken() !== token;
		return getExtensionContext()
			.globalState.update(GITLAB_OAUTH_TOKEN, token)
			.then(() => isTokenChanged && this._emitter.fire(token));
	}

	public async validateToken(token?: string): Promise<TokenStatus | null> {
		const fetchOptions = this.getHeader(token);
		return fetch(`${GITLAB_DOMAIN}/api/v4/projects?per_page=1`, fetchOptions)
			.then((response) => {
				if (response.status === 401) {
					return null;
				}
				// TODO gitlab does not support get cros headers
				return {
					ratelimitLimit: +response.headers.get('ratelimit-limit')! || 0,
					ratelimitRemaining: +response.headers.get('ratelimit-remaining')! || 0,
					ratelimitReset: +response.headers.get('ratelimit-reset')! || 0,
					ratelimitResource: +response.headers.get('ratelimit-resource')! || 0,
					ratelimitUsed: +response.headers.get('ratelimit-observed')! || 0,
				};
			})
			.catch(() => null);
	}
}
