/**
 * @file GitHub1s Settings Webview Provider
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { createPageHtml, getWebviewOptions } from '@/helpers/page';
import { GitHubTokenManager } from './token';
import { GitHubFetcher } from './fetcher';

export const messageApiMap = {
	info: vscode.window.showInformationMessage,
	warning: vscode.window.showWarningMessage,
	error: vscode.window.showErrorMessage,
};

export class GitHub1sSettingsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'github1s.views.settings';

	protected tokenManager = GitHubTokenManager.getInstance();
	protected apiFetcher: Pick<
		GitHubFetcher,
		'getPreferSourcegraphApi' | 'setPreferSourcegraphApi' | 'onDidChangePreferSourcegraphApi'
	> = GitHubFetcher.getInstance();

	protected pageTitle = 'GitHub1s Settings';
	protected OAuthCommand = 'github1s.commands.vscode.connectToGitHub';
	protected detailPageCommand = 'github1s.commands.openGitHub1sAuthPage';
	protected pageConfig = {
		pageDescriptionLines: [
			'For unauthenticated requests, the rate limit of GitHub allows for up to 60 requests per hour.',
			'For API requests using Authentication, you can make up to 5,000 requests per hour.',
		],
		OAuthButtonText: 'Connect to GitHub',
		createTokenLink: `${GITHUB_ORIGIN}/settings/tokens/new?scopes=repo&description=GitHub1s`,
	};

	public registerListeners(webviewView: vscode.WebviewView) {
		webviewView.webview.onDidReceiveMessage((message) => {
			const commonResponse = { id: message.id, type: message.type };
			const postMessage = (data?: unknown) => webviewView.webview.postMessage({ ...commonResponse, data });

			switch (message.type) {
				case 'get-token':
					postMessage(this.tokenManager.getToken());
					break;
				case 'set-token':
					this.tokenManager.setToken(message.data || '').then(() => postMessage());
					break;
				case 'validate-token':
					this.tokenManager.validateToken(message.data).then((tokenStatus) => postMessage(tokenStatus));
					break;
				case 'open-detail-page':
					vscode.commands.executeCommand(this.detailPageCommand).then(() => postMessage());
					break;
				case 'oauth-authorizing':
					vscode.commands.executeCommand(this.OAuthCommand).then((data: any) => {
						if (data && data.error_description) {
							vscode.window.showErrorMessage(data.error_description);
						} else if (data && data.access_token) {
							this.tokenManager.setToken(data.access_token || '');
						}
						postMessage();
					});
					break;
				case 'call-vscode-message-api':
					const messageApi = messageApiMap[message.data?.level];
					messageApi && messageApi(...message.data?.args).then((response) => postMessage(response));
					break;
				case 'get-prefer-sourcegraph-api':
					this.apiFetcher.getPreferSourcegraphApi().then((value) => postMessage(value));
					break;
				case 'set-prefer-sourcegraph-api':
					this.apiFetcher.setPreferSourcegraphApi(message.data);
					postMessage(message.data);
					break;
			}
		});

		this.tokenManager.onDidChangeToken((token) => {
			webviewView.webview.postMessage({ type: 'token-changed', token });
		});
		this.apiFetcher.onDidChangePreferSourcegraphApi((value) => {
			webviewView.webview.postMessage({ type: 'prefer-sourcegraph-api-changed', value });
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
		const globalPageConfig = { ...this.pageConfig, extensionUri: extensionContext.extensionUri.toString() };
		const scripts = [
			'data:text/javascript;base64,' +
				Buffer.from(`window.pageConfig=${JSON.stringify(globalPageConfig)};`).toString('base64'),
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-settings.js').toString(),
		];
		webviewView.webview.html = createPageHtml(this.pageTitle, styles, scripts);
	}
}
