/**
 * @file github authorizing page
 * @author netcon
 */

import * as vscode from 'vscode';
import { getAuthorizationHtml } from './authorization-html';

export class GitHub1sAuthorizationView {
	private static instance: GitHub1sAuthorizationView = null;
	public static viewType = 'github1s.views.github1s-authorizing';
	private _webviewPanel = null;

	private constructor() {}

	public static getInstance(): GitHub1sAuthorizationView {
		if (GitHub1sAuthorizationView.instance) {
			return GitHub1sAuthorizationView.instance;
		}
		return (GitHub1sAuthorizationView.instance = new GitHub1sAuthorizationView());
	}

	open() {
		if (!this._webviewPanel) {
			this._webviewPanel = vscode.window.createWebviewPanel(
				GitHub1sAuthorizationView.viewType,
				'Authenticating to GitHub',
				vscode.ViewColumn.One,
				{ enableScripts: true }
			);
			this._webviewPanel.onDidDispose(() => (this._webviewPanel = null));
		}
		this._webviewPanel.webview.html = getAuthorizationHtml();
	}
}
