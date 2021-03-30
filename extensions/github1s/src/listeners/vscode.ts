/**
 * @file listeners for vscode event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { PageType } from '@/router/types';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';

export const registerVSCodeEventListeners = () => {
	// replace current url when user change active editor
	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		const { owner, repo, ref, pageType } = await router.getState();
		const activeFileUri = editor?.document.uri;

		// if no file opened and the branch is HEAD current,
		// only retain `owner` and `repo` (and `ref` if need) in url
		if (!activeFileUri) {
			const browserPath =
				ref.toUpperCase() === 'HEAD'
					? `/${owner}/${repo}`
					: `/${owner}/${repo}/tree/${ref}`;
			router.history.replace(browserPath);
			return;
		}

		if (
			// only `tree/blob` page will replace url with the active editor change
			![PageType.TREE, PageType.BLOB].includes(pageType) ||
			// only the file in explorer will change the router,
			// the file in explorer will have a empty authority
			activeFileUri?.authority ||
			activeFileUri?.scheme !== GitHub1sFileSystemProvider.scheme
		) {
			return;
		}

		const browserPath = `/${owner}/${repo}/blob/${ref}${activeFileUri.path}`;
		router.history.replace(browserPath);
	});
};
