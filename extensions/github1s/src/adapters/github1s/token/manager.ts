/**
 * @file github api auth token manager
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { getAuthorizationHtml } from './authorization-html';

const GITHUB_OAUTH_TOKEN = 'github-oauth-token';

export class GitHubTokenManager {
	private static instance: GitHubTokenManager = null;
	private _viewType = 'github1s.views.authorizing-page';
	private _webviewPanel = null;

	private constructor() {}
	public static getInstance(): GitHubTokenManager {
		if (GitHubTokenManager.instance) {
			return GitHubTokenManager.instance;
		}
		return (GitHubTokenManager.instance = new GitHubTokenManager());
	}

	public getToken(): Promise<string> {
		return new Promise((resolve, reject) => {});
	}

	public setToken(token: string) {
		getExtensionContext().globalState.update(GITHUB_OAUTH_TOKEN, token);
	}
}
