/**
 * @file GitHub1s Settings Webview Provider
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { createPageHtml, getWebviewOptions } from '@/helpers/page';
import { GitHubTokenManager } from './token';

interface WebviewState {
	token?: string;
	pageType?: 'EDIT' | 'PREVIEW';
	valid?: boolean;
	validating?: boolean;
}

const messageApiMap = {
	info: vscode.window.showInformationMessage,
	warning: vscode.window.showWarningMessage,
	error: vscode.window.showErrorMessage,
};

export class GitHub1sSettingsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'github1s.views.settings';

	public registerListeners(webviewView) {
		webviewView.webview.onDidReceiveMessage((message) => {
			switch (message.type) {
				case 'get-token':
					webviewView.webview.postMessage({
						id: message.id,
						type: message.type,
						data: GitHubTokenManager.getInstance().getToken(),
					});
					break;
				case 'set-token':
					GitHubTokenManager.getInstance().setToken(message.data || '');
					webviewView.webview.postMessage({
						id: message.id,
						type: message.type,
					});
					break;
				case 'validate-token':
					GitHubTokenManager.getInstance()
						.validateToken(message.data)
						.then((tokenStatus) =>
							webviewView.webview.postMessage({
								id: message.id,
								type: message.type,
								data: tokenStatus,
							})
						);
					break;
				case 'open-detail-page':
					vscode.commands.executeCommand('github1s.open-authentication-page');
					webviewView.webview.postMessage({
						id: message.id,
						type: message.type,
					});
				case 'call-vscode-message-api':
					const messageApi = messageApiMap[message.data?.level];
					messageApi &&
						messageApi(...message.data?.args).then((response) => {
							webviewView.webview.postMessage({
								id: message.id,
								type: message.type,
								data: response,
							});
						});
			}
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
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-settings.js').toString(),
		];
		webviewView.webview.html = createPageHtml('GitHub1s Settings', styles, scripts);
	}
}
