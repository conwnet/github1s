/**
 * @file listeners for vscode event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { PageType } from '@/router/types';
import { GitHub1sFileSearchProvider } from '@/providers/fileSearchProvider';

export const registerVSCodeEventListeners = () => {
	// replace current url when user change active editor
	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		const { owner, repo, ref, pageType, pullNumber } = await router.getState();
		const activeFileUri = editor?.document.uri;

		if (activeFileUri?.scheme !== GitHub1sFileSearchProvider.scheme) {
			return;
		}

		// only `tree/blob` page will replace url with the active editor change
		if ([PageType.TREE, PageType.BLOB].includes(pageType)) {
			const filePath = activeFileUri?.path || '';
			// if no file opened and the branch is HEAD current, only retain owner and repo in url
			const browserPath =
				!filePath && ref.toUpperCase() === 'HEAD'
					? `/${owner}/${repo}`
					: `/${owner}/${repo}/${filePath ? 'blob' : 'tree'}/${ref}${filePath}`;
			router.history.replace(browserPath);
		}
	});
};
