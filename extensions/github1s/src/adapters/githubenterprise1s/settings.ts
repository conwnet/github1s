/**
 * @file GitHub1s Settings Webview Provider
 * @author netcon
 * @updated by kcoms555 for Enterprise
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { createPageHtml, getWebviewOptions } from '@/helpers/page';
import { GitHubEnterpriseTokenManager } from './token';
import { GitHubEnterpriseFetcher } from './fetcher';

export const messageApiMap = {
	info: vscode.window.showInformationMessage,
	warning: vscode.window.showWarningMessage,
	error: vscode.window.showErrorMessage,
};

export class GitHubEnterprise1sSettingsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'github1s.views.settings';

	public registerListeners(webviewView: vscode.WebviewView) {
		const tokenManager = GitHubEnterpriseTokenManager.getInstance();
		const githubFetcher = GitHubEnterpriseFetcher.getInstance();

		webviewView.webview.onDidReceiveMessage((message) => {
			const commonResponse = { id: message.id, type: message.type };
			const postMessage = (data?: unknown) => webviewView.webview.postMessage({ ...commonResponse, data });

			switch (message.type) {
				case 'get-token':
					postMessage(tokenManager.getToken());
					break;
				case 'set-token':
					tokenManager.setToken(message.data || '').then(() => postMessage());
					break;
				case 'validate-token':
					tokenManager.validateToken(message.data).then((tokenStatus) => postMessage(tokenStatus));
					break;
				case 'open-detail-page':
					vscode.commands.executeCommand('github1s.commands.openGitHubEnterprise1sAuthPage').then(() => postMessage());
					break;
				case 'connect-to-github':
					vscode.commands.executeCommand('github1s.commands.vscode.connectToGitHubEnterprise').then((data: any) => {
						if (data && data.error_description) {
							vscode.window.showErrorMessage(data.error_description);
						} else if (data && data.access_token) {
							GitHubEnterpriseTokenManager.getInstance().setToken(data.access_token || '');
						}
						postMessage();
					});
					break;
				case 'call-vscode-message-api':
					const messageApi = messageApiMap[message.data?.level];
					messageApi && messageApi(...message.data?.args).then((response) => postMessage(response));
					break;
				case 'get-use-sourcegraph-api':
					githubFetcher.useSourcegraphApiFirst().then((value) => postMessage(value));
					break;
				case 'set-use-sourcegraph-api':
					githubFetcher.setUseSourcegraphApiFirst(message.data);
					postMessage(message.data);
					break;
			}
		});

		tokenManager.onDidChangeToken((token) => {
			webviewView.webview.postMessage({ type: 'token-changed', token });
		});
		githubFetcher.onDidChangeUseSourcegraphApiFirst((value) => {
			webviewView.webview.postMessage({ type: 'use-sourcegraph-api-changed', value });
		});
	}

	public resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		const extensionContext = getExtensionContext();

		this.registerListeners(webviewView);
		webviewView.webview.options = getWebviewOptions(extensionContext.extensionUri);

		const styles = [
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/components.css').toString(),
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-settings.css').toString(),
		];
		const scripts = [
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/githubenterprise1s-settings.js').toString(),
		];
		webviewView.webview.html = createPageHtml('GitHubEnterprise1s Settings', styles, scripts);
	}
}
