/**
 * @file listeners for vscode event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { setVSCodeContext } from '@/helpers/vscode';
import { getChangedFileFromSourceControl } from '@/commands/editor';
import { debounce } from '@/helpers/func';
import { PageType } from '@/adapters/types';
import { adapterManager } from '@/adapters';

const handleRouterOnActiveEditorChange = async (editor: vscode.TextEditor | undefined) => {
	// replace current url when user change active editor
	const { repo, ref, pageType } = await router.getState();
	const activeFileUri = editor?.document.uri;

	// only `tree/blob` page will replace url with the active editor change
	if (![PageType.Tree, PageType.Blob].includes(pageType)) {
		return;
	}

	const routerParser = await adapterManager.getCurrentAdapter().resolveRouterParser();

	// if the file which not belong to current workspace is opened, or no file
	// is opened, only retain `repo` (and `ref` if need) in browser url
	if (!activeFileUri || activeFileUri?.authority || activeFileUri?.scheme !== adapterManager.getCurrentScheme()) {
		const browserPath = await (ref.toUpperCase() === 'HEAD'
			? routerParser.buildTreePath(repo)
			: routerParser.buildTreePath(repo, ref));
		router.replace(browserPath);
		return;
	}

	const browserPath = await routerParser.buildBlobPath(repo, ref, activeFileUri.path.slice(1));
	router.replace(browserPath);
};

// if the `Open Changes` Button should show in editor title
const handleOpenChangesContextOnActiveEditorChange = async (editor: vscode.TextEditor | undefined) => {
	const changedFile = editor?.document.uri ? await getChangedFileFromSourceControl(editor.document.uri) : undefined;

	return setVSCodeContext('github1s.context.show-open-changes-in-editor-title', !!changedFile);
};

// set the `gutterBlameOpening` to false when the active editor changed
const handleGutterBlameOpeningContextOnActiveEditorChange = async () => {
	return setVSCodeContext('github1s.context.gutterBlameOpening', false);
};

// add the line number anchor when user selection lines in a editor
const handleRouterOnTextEditorSelectionChange = async (editor: vscode.TextEditor) => {
	const { repo, ref, pageType } = await router.getState();

	// only add the line number anchor when pageType is PageType.Blob
	if (pageType !== PageType.Blob || !editor.selection) {
		return;
	}

	const routerParser = await adapterManager.getCurrentAdapter().resolveRouterParser();

	const activeFileUri = editor?.document.uri;
	const browserPath = await routerParser.buildBlobPath(
		repo,
		ref,
		activeFileUri.path.slice(1),
		editor.selection.start.line,
		editor.selection.end.line
	);

	router.replace(browserPath);
};

export const registerVSCodeEventListeners = () => {
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		handleRouterOnActiveEditorChange(editor);
		handleOpenChangesContextOnActiveEditorChange(editor);
		handleGutterBlameOpeningContextOnActiveEditorChange();
	});

	// debounce to update the browser url
	const debouncedSelectionChangeRouterHandler = debounce(handleRouterOnTextEditorSelectionChange, 100);
	vscode.window.onDidChangeTextEditorSelection((event) => {
		debouncedSelectionChangeRouterHandler(event.textEditor);
	});
};
