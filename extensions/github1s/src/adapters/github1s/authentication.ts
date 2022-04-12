/**
 * @file github authentication page
 * @author netcon
 */

import { Barrier } from '@/helpers/async';
import { getExtensionContext } from '@/helpers/context';
import * as vscode from 'vscode';
import { GitHubTokenManager } from './token';
import { createPageHtml, getWebviewOptions } from '@/helpers/page';

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
		this.webviewPanel.webview.onDidReceiveMessage((message) => {
			switch (message.type) {
				case 'get-notice':
					this.webviewPanel!.webview.postMessage({
						id: message.id,
						type: message.type,
						data: this.notice,
					});
					break;
				case 'get-token':
					this.webviewPanel!.webview.postMessage({
						id: message.id,
						type: message.type,
						data: GitHubTokenManager.getInstance().getToken(),
					});
					break;
				case 'set-token':
					GitHubTokenManager.getInstance()
						.setToken(message.data || '')
						.then(() => {
							this.tokenBarrier && this.tokenBarrier.open();
							this.tokenBarrier && (this.tokenBarrier = null);
							this.webviewPanel!.webview.postMessage({
								id: message.id,
								type: message.type,
							});
						});
					break;
				case 'validate-token':
					GitHubTokenManager.getInstance()
						.validateToken(message.data)
						.then((tokenStatus) =>
							this.webviewPanel!.webview.postMessage({
								id: message.id,
								type: message.type,
								data: tokenStatus,
							})
						);
					break;
			}
		});

		GitHubTokenManager.getInstance().onDidChangeToken((token) => {
			this.webviewPanel!.webview.postMessage({ type: 'token-changed', token });
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

		this.webviewPanel.webview.html = createPageHtml('Authenticating To GitHub', styles, scripts);
		return withBarriar ? this.tokenBarrier!.wait() : Promise.resolve();
	}
}
