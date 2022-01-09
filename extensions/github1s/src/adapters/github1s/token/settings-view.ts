/**
 * @file GitHub1s Settings Webview Provider
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { getWebviewOptions } from '@/helpers/util';
import { validateToken } from '../interfaces';
import { GITHUB_OAUTH_TOKEN } from '@/helpers/constants';
import { getSettingsHtml } from './settings-html';
import { GitHubTokenManager } from '../token/manager';
import { GitHub1sAuthorizationView } from './authorization-view';

interface WebviewState {
	token?: string;
	pageType?: 'EDIT' | 'PREVIEW';
	valid?: boolean;
	validating?: boolean;
}

export class GitHub1sSettingsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'github1s.views.github1s-settings';
	private readonly _extensionContext: vscode.ExtensionContext;
	private _webviewView: vscode.WebviewView;

	constructor() {
		this._extensionContext = getExtensionContext();
	}

	resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		this._webviewView = webviewView;
		webviewView.webview.options = getWebviewOptions(this._extensionContext.extensionUri);
		webviewView.webview.html = getSettingsHtml();

		webviewView.webview.onDidReceiveMessage((data) => {
			switch (data.type) {
				case 'validate-token':
					this.handleValidateToken(data.payload);
					break;
				case 'update-token':
					this.handleUpdateToken(data.payload);
					break;
				case 'clear-token':
					GitHubTokenManager.getInstance().setToken('');
					break;
				case 'detail-page':
					GitHub1sAuthorizationView.getInstance().open();
					break;
				case 'authorizing-github':
					this.handleAuthorizingGithub();
					break;
				default:
					const oauthToken = (this._extensionContext.globalState.get(GITHUB_OAUTH_TOKEN) as string) || '';
					(oauthToken
						? validateToken(oauthToken).then((data) => data.valid && data.remaining > 0)
						: Promise.resolve(false)
					).then((isValid) => {
						this.updateWebviewState({
							token: oauthToken,
							pageType: oauthToken ? 'PREVIEW' : 'EDIT',
							valid: isValid,
							validating: false,
						});
					});
			}
		});
	}

	updateWebviewState(state: WebviewState) {
		this._webviewView.webview.postMessage({
			type: 'update-state',
			payload: state,
		});
	}

	handleValidateToken(token: string) {
		this.updateWebviewState({ validating: true });
		validateToken(token)
			.then((tokenStatus) => {
				if (!tokenStatus.valid) {
					vscode.window.showErrorMessage('This GitHub OAuth Token is invalid.');
				} else if (tokenStatus.remaining <= 0) {
					vscode.window.showWarningMessage('This GitHub OAuth Token is valid, but the rate limit is exceeded.');
				} else {
					vscode.window.showInformationMessage('This GitHub OAuth Token is OK.');
				}
				this.updateWebviewState({
					valid: tokenStatus.valid && tokenStatus.remaining > 0,
					validating: false,
				});
			})
			.catch(() => this.updateWebviewState({ valid: false, validating: false }));
	}

	handleUpdateToken(token: string) {
		if (!token) {
			return;
		}
		this.updateWebviewState({ validating: true });
		validateToken(token)
			.then((tokenStatus) => {
				if (!tokenStatus.valid) {
					this.updateWebviewState({ pageType: 'EDIT', validating: false });
					vscode.window.showErrorMessage('This GitHub OAuth Token is invalid.');
				} else if (tokenStatus.remaining <= 0) {
					this.updateWebviewState({ pageType: 'EDIT', validating: false });
					vscode.window.showWarningMessage('This GitHub OAuth Token is valid, but the rate limit is exceeded.');
				} else {
					this.updateWebviewState({
						token,
						valid: true,
						pageType: 'PREVIEW',
						validating: false,
					});
					this._extensionContext.globalState.update(GITHUB_OAUTH_TOKEN, token || '').then(() => {
						vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
					});
				}
			})
			.catch(() => this.updateWebviewState({ token, validating: false }));
	}

	async handleAuthorizingGithub() {
		const token: string = await vscode.commands.executeCommand('github1s.authorizing-github');
		if (!token) {
			return;
		}
		this.updateWebviewState({
			token,
			valid: true,
			pageType: 'PREVIEW',
			validating: false,
		});
	}
}
