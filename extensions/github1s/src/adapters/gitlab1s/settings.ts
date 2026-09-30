/**
 * @file GitLab1s Settings Webview Provider
 * @author netcon
 */

import * as vscode from 'vscode';
import { GitLabTokenManager } from './token';
import { GitLabFetcher } from './fetcher';
import { getCurrentRepo } from './parse-path';
import { resolveProjectAccessTokenLink } from './links';
import { GitHub1sSettingsViewProvider } from '../github1s/settings';

export class GitLab1sSettingsViewProvider extends GitHub1sSettingsViewProvider {
	protected tokenManager = GitLabTokenManager.getInstance();
	protected apiFetcher = GitLabFetcher.getInstance();

	protected OAuthCommand = 'github1s.commands.vscode.connectToGitLab';
	protected detailPageCommand = 'github1s.commands.openGitLab1sAuthPage';
	protected pageConfig = {
		pageDescriptionLines: [
			'Create a Project Access Token and copy it immediately — GitLab shows it only once.',
			'Scopes: read_api and read_repository. No prefix is normal on newer GitLab versions.',
			'The token is validated against the project in the current URL before it is saved.',
		],
		OAuthButtonText: 'Connect to GitLab',
		createTokenLink: resolveProjectAccessTokenLink(''),
	};

	public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
		const repo = await getCurrentRepo();
		this.pageConfig = {
			...this.pageConfig,
			createTokenLink: resolveProjectAccessTokenLink(repo),
		};
		return super.resolveWebviewView(webviewView);
	}
}
