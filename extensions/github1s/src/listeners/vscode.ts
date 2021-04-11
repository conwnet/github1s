/**
 * @file listeners for vscode event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { PageType } from '@/router/types';
import { getChangedFileFromSourceControl } from '@/commands/editor';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';

const handleRouterOnActiveEditorChange = async (
	editor: vscode.TextEditor | undefined
) => {
	// replace current url when user change active editor
	const { owner, repo, ref, pageType } = await router.getState();
	const activeFileUri = editor?.document.uri;

	// only `tree/blob` page will replace url with the active editor change
	if (![PageType.TREE, PageType.BLOB].includes(pageType)) {
		return;
	}

	// if the file which not belong to current workspace is opened, or no file
	// is opened, only retain `owner` and `repo` (and `ref` if need) in browser url
	if (
		!activeFileUri ||
		activeFileUri?.authority ||
		activeFileUri?.scheme !== GitHub1sFileSystemProvider.scheme
	) {
		const browserPath =
			ref.toUpperCase() === 'HEAD'
				? `/${owner}/${repo}`
				: `/${owner}/${repo}/tree/${ref}`;
		router.history.replace(browserPath);
		return;
	}

	const browserPath = `/${owner}/${repo}/blob/${ref}${activeFileUri.path}`;
	router.history.replace(browserPath);
};

// if the `Open Changes` Button should show in editor title
const handleOpenChangesContextOnActiveEditorChange = async (
	editor: vscode.TextEditor | undefined
) => {
	const changedFile = editor?.document.uri
		? await getChangedFileFromSourceControl(editor.document.uri)
		: undefined;

	return vscode.commands.executeCommand(
		'setContext',
		'github1s.context.showOpenChangesInEditorTitle',
		!!changedFile
	);
};

export const registerVSCodeEventListeners = () => {
	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		handleRouterOnActiveEditorChange(editor);
		handleOpenChangesContextOnActiveEditorChange(editor);
	});
};
