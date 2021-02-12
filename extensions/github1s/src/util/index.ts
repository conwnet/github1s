/**
 * @file common util
 * @author netcon
 */

import * as vscode from 'vscode';
export { fetch } from './fetch';
export { reuseable, throttle } from './func';
export { getExtensionContext, setExtensionContext, hasValidToken, getOAuthToken } from './context';

export const noop = () => { };

export const trimStart = (str: string, chars: string = ' '): string => {
	let index = 0;
	while (chars.indexOf(str[index]) !== -1) {
		index++;
	}
	return str.slice(index);
};

export const trimEnd = (str: string, chars: string = ' '): string => {
	let length = str.length;
	while (length && chars.indexOf(str[length - 1]) !== -1) {
		length--;
	}
	return str.slice(0, length);
};

export const joinPath = (...segments: string[]): string => {
	if (!segments.length) {
		return '';
	}

	return segments.reduce((prev, segment) => {
		return trimEnd(prev, '/') + '/' + trimStart(segment, '/');
	});
};

export const dirname = (path: string): string => {
	const trimmedPath = trimEnd(path, '/');
	return trimmedPath.substr(0, trimmedPath.lastIndexOf('/')) || '';
};

export const uniqueId = (id => () => id++)(1);

export const prop = (obj: object, path: (string | number)[] = []): any => {
	let cur = obj;
	path.forEach(key => (cur = (cur ? cur[key] : undefined)));
	return cur;
};

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
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'assets')]
	};
};
