/**
 * @file listeners for vscode event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';

export const registerVSCodeEventListeners = () => {
	// replace current url when user change active editor
	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		const filePath = editor?.document.uri.path || '';
		const { owner, repo, ref } = await router.getState();

		// if no file opened and the branch is HEAD current, only retain owner and repo in url
		const browserPath =
			!filePath && ref.toUpperCase() === 'HEAD'
				? `/${owner}/${repo}`
				: `/${owner}/${repo}/${filePath ? 'blob' : 'tree'}/${ref}${filePath}`;
		router.history.replace(browserPath);
	});
};
