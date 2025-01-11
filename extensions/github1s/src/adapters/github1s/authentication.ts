/**
 * @file github authentication page
 * @author netcon
 */

import * as vscode from 'vscode';
import { Barrier } from '@/helpers/async';
import { getExtensionContext } from '@/helpers/context';
import { createPageHtml, getWebviewOptions } from '@/helpers/page';
import { GitHubTokenManager } from './token';
import { messageApiMap } from './settings';

export class GitHub1sAuthenticationView {
	protected static instance: GitHub1sAuthenticationView | null = null;
	public static viewType = 'github1s.views.github1s-authentication';
	protected tokenManager = GitHubTokenManager.getInstance();
	private webviewPanel: vscode.WebviewPanel | null = null;
	// using for waiting token
	private tokenBarrier: Barrier | null = null;
	// using for displaying open page reason
	private notice: string = '';

	protected pageTitle = 'Authenticating to GitHub';
	protected OAuthCommand = 'github1s.commands.vscode.connectToGitHub';
	protected pageConfig: Record<string, unknown> = {
		authenticationFormTitle: 'Authenticating to GitHub',
		OAuthButtonText: 'Connect to GitHub',
		OAuthButtonLogo: 'assets/pages/assets/github.svg',
		createTokenLink: `${GITHUB_ORIGIN}/settings/tokens/new?scopes=repo&description=GitHub1s`,
		rateLimitDocLink: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
		rateLimitDocLinkText: 'GitHub Rate limiting Documentation',
		authenticationFeatures: [
			{
				text: 'Access GitHub personal repository',
				link: 'https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-access-to-your-personal-repositories',
			},
			{
				text: 'Higher rate limit for GitHub official API',
				link: 'https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting',
			},
			{
				text: 'Support for GitHub GraphQL API',
				link: 'https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql',
			},
		],
	};

	protected constructor() {}

	public static getInstance(): GitHub1sAuthenticationView {
		if (GitHub1sAuthenticationView.instance) {
			return GitHub1sAuthenticationView.instance;
		}
		return (GitHub1sAuthenticationView.instance = new this());
	}

	private registerListeners() {
		if (!this.webviewPanel) {
			throw new Error('webview is not init yet');
		}

		this.webviewPanel.webview.onDidReceiveMessage((message) => {
			const commonResponse = { id: message.id, type: message.type };
			const postMessage = (data?: unknown) => this.webviewPanel!.webview.postMessage({ ...commonResponse, data });

			switch (message.type) {
				case 'get-notice':
					postMessage(this.notice);
					break;
				case 'get-token':
					postMessage(this.tokenManager.getToken());
					break;
				case 'set-token':
					message.data && (this.notice = '');
					this.tokenManager.setToken(message.data || '').then(() => postMessage());
					break;
				case 'validate-token':
					this.tokenManager.validateToken(message.data).then((tokenStatus) => postMessage(tokenStatus));
					break;
				case 'oauth-authorizing':
					vscode.commands.executeCommand(this.OAuthCommand).then((data: any) => {
						if (data && data.error_description) {
							vscode.window.showErrorMessage(data.error_description);
						} else if (data && data.access_token) {
							this.tokenManager.setToken(data.access_token || '').then(() => postMessage());
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

		this.tokenManager.onDidChangeToken((token) => {
			this.tokenBarrier && this.tokenBarrier.open();
			this.tokenBarrier && (this.tokenBarrier = null);
			this.webviewPanel?.webview.postMessage({ type: 'token-changed', token });
		});
	}

	public open(notice: string = '', withBarrier = false) {
		const extensionContext = getExtensionContext();

		this.notice = notice;
		withBarrier && !this.tokenBarrier && (this.tokenBarrier = new Barrier(600 * 1000));

		if (!this.webviewPanel) {
			this.webviewPanel = vscode.window.createWebviewPanel(
				GitHub1sAuthenticationView.viewType,
				this.pageTitle,
				vscode.ViewColumn.One,
				getWebviewOptions(extensionContext.extensionUri),
			);
			this.registerListeners();
			this.webviewPanel.onDidDispose(() => (this.webviewPanel = null));
		}

		const styles = [
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/components.css').toString(),
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-authentication.css').toString(),
		];
		const globalPageConfig = { ...this.pageConfig, extensionUri: extensionContext.extensionUri.toString() };
		const scripts = [
			'data:text/javascript;base64,' +
				Buffer.from(`window.pageConfig=${JSON.stringify(globalPageConfig)};`).toString('base64'),
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-authentication.js').toString(),
		];

		const webview = this.webviewPanel.webview;
		webview.html = createPageHtml(this.pageTitle, styles, scripts);
		return withBarrier ? this.tokenBarrier!.wait() : Promise.resolve();
	}
}
