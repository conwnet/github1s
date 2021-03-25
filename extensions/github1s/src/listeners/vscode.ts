/**
 * @file listeners for vscode event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { PageType } from '@/router/types';
import { GitHub1sFileSearchProvider } from '@/providers/fileSearchProvider';

// current editor is recovered by vscode, but should be closed now
const shouldClosedThisEditor = async (editor) => {
	const { pullNumber, commitSha } = await router.getState();
	const resourceUriQuery = editor?.document.uri.query;
	const resourcePullNumber = resourceUriQuery?.match(/\bpull=(\d+)/)?.[1];
	const resourceCommitSha = resourceUriQuery?.match(/\bcommit=([^&#]+)/)?.[1];

	return (
		(resourcePullNumber && +resourcePullNumber !== pullNumber) ||
		(resourceCommitSha && resourceCommitSha !== commitSha)
	);
};

export const registerVSCodeEventListeners = () => {
	// replace current url when user change active editor
	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		const { owner, repo, ref, pageType, pullNumber } = await router.getState();
		const activeFileUri = editor?.document.uri;

		if (activeFileUri?.scheme !== GitHub1sFileSearchProvider.scheme) {
			return;
		}

		// TODO: How to deal with opened editor?
		// if (await shouldClosedThisEditor(editor)) {
		// 	vscode.commands.executeCommand(
		// 		'workbench.action.closeActiveEditor',
		// 		activeFileUri
		// 	);
		// 	return;
		// }

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
