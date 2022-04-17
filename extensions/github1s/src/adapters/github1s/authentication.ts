/**
 * @file github authentication page
 * @author netcon
 */

import { Barrier } from '@/helpers/async';
import { getExtensionContext } from '@/helpers/context';
import * as vscode from 'vscode';
import { GitHubTokenManager } from './token';
import { createPageHtml, getWebviewOptions } from '@/helpers/page';
import { messageApiMap } from './settings';

export class GitHub1sAuthenticationView {
	private static instance: GitHub1sAuthenticationView | null = null;
	public static viewType = 'github1s.views.github1s-authentication';
	private webviewPanel: vscode.WebviewPanel | null = null;
	// using for waiting token
	private tokenBarrier: Barrier | null = null;
	// using for displaying open page reason
	private notice: string = '';

	private constructor() {}

	public static getInstance(): GitHub1sAuthenticationView {
		if (GitHub1sAuthenticationView.instance) {
			return GitHub1sAuthenticationView.instance;
		}
		return (GitHub1sAuthenticationView.instance = new GitHub1sAuthenticationView());
	}

	private registerListeners() {
		if (!this.webviewPanel) {
			throw new Error('webview is not inited yet');
		}
		const tokenManager = GitHubTokenManager.getInstance();

		this.webviewPanel.webview.onDidReceiveMessage((message) => {
			const commonResponse = { id: message.id, type: message.type };
			const postMessage = (data?: unknown) => this.webviewPanel!.webview.postMessage({ ...commonResponse, data });

			switch (message.type) {
				case 'get-notice':
					postMessage(this.notice);
					break;
				case 'get-token':
					postMessage(tokenManager.getToken());
					break;
				case 'set-token':
					message.data && (this.notice = '');
					tokenManager.setToken(message.data || '').then(() => {
						this.tokenBarrier && this.tokenBarrier.open();
						this.tokenBarrier && (this.tokenBarrier = null);
						return postMessage();
					});
					break;
				case 'validate-token':
					tokenManager.validateToken(message.data).then((tokenStatus) => postMessage(tokenStatus));
					break;
				case 'connect-to-github':
					vscode.commands.executeCommand('github1s.commands.vscode.connectToGitHub').then((data: any) => {
						if (data && data.error_description) {
							vscode.window.showErrorMessage(data.error_description);
						} else if (data && data.access_token) {
							tokenManager.setToken(data.access_token || '').then(() => postMessage());
						}
						postMessage();
					});
					break;
				case 'call-vscode-message-api':
					const messageApi = messageApiMap[message.data?.level];
					messageApi && messageApi(...message.data?.args).then((response) => postMessage(response));
					break;
			}
		});

		tokenManager.onDidChangeToken((token) => {
			this.webviewPanel?.webview.postMessage({ type: 'token-changed', token });
		});
	}

	public open(notice: string = '', withBarriar = false) {
		const extensionContext = getExtensionContext();

		this.notice = notice;
		withBarriar && !this.tokenBarrier && (this.tokenBarrier = new Barrier(300 * 1000));

		if (!this.webviewPanel) {
			this.webviewPanel = vscode.window.createWebviewPanel(
				GitHub1sAuthenticationView.viewType,
				'Authenticating to GitHub',
				vscode.ViewColumn.One,
				getWebviewOptions(extensionContext.extensionUri)
			);
			this.registerListeners();
			this.webviewPanel.onDidDispose(() => (this.webviewPanel = null));
		}

		const styles = [
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/components.css').toString(),
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-authentication.css').toString(),
		];
		const scripts = [
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-authentication.js').toString(),
		];

		const webview = this.webviewPanel.webview;
		webview.html = createPageHtml('Authenticating To GitHub', styles, scripts);
		return withBarriar ? this.tokenBarrier!.wait() : Promise.resolve();
	}
}
