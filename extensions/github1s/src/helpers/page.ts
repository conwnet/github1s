/**
 * @file page html helpers
 * @author netcon
 */

import * as vscode from 'vscode';

export const getNonce = (): string => {
	let text: string = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

export const getWebviewOptions = (extensionUri: vscode.Uri): vscode.WebviewOptions => {
	return {
		// Enable javascript in the webview
		enableScripts: true,
		// And restrict the webview to only loading content from our extension's `assets` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'assets')],
	};
};

export const createPageHtml = (title: string, styles: string[] = [], scripts: string[] = []) => {
	const nonce = getNonce();
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="X-UA-Compatible" content="IE=edge">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
			<title>${title}</title>
			${styles.map((style) => `<link rel="stylesheet" nonce="${nonce}" href="${style}" />`).join('')}
			<style nonce="${nonce}">
				body {
					margin: 0;
					padding: 0;
					background-color: transparent;
				}
				#page-loading {
					width: 100%;
					text-align: center;
					height: 40px;
					margin-top: 60px;
				}

				#page-loading > span {
					height: 100%;
					width: 8px;
					display: inline-block;
					margin-right: 6px;
					background: var(--vscode-button-background);
					animation: pageLoading 1.2s infinite ease-in-out;
				}

				#page-loading > span:nth-child(2) {
					animation-delay: -1s;
				}
				
				#page-loading > span:nth-child(3) {
					animation-delay: -0.9s;
				}
				
				#page-loading > span:nth-child(4) {
					animation-delay: -0.8s;
				}
				
				#page-loading > span:nth-child(5) {
					margin-right: 0 !important;
					animation-delay: -0.7s;
				}
				
				@keyframes pageLoading {
					0% { transform: scaleY(0.4); }
					25% {
						transform: scaleY(1);
					}
					50% {
						transform: scaleY(0.4);
					}
					75% {
						transform: scaleY(0.4);
					}
					100% {
						transform: scaleY(0.4);
					}
				}
			</style>
		</head>
		<body>
			<div id="page-loading">
				<span></span><span></span><span></span><span></span><span></span>
			</div>
		  <div id="app"></div>
		  ${scripts.map((script) => `<script type="module" nonce="${nonce}" src="${script}"></script>`)}
		</body>
		</html>
	 `;
};
