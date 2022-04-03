/**
 * @file listeners for vscode event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { PageType } from '@/router/types';
import { setVSCodeContext } from '@/helpers/vscode';
import { getChangedFileFromSourceControl } from '@/commands/editor';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';
import { debounce } from '@/helpers/func';

const handleRouterOnActiveEditorChange = async (editor: vscode.TextEditor | undefined) => {
	// replace current url when user change active editor
	const { owner, repo, ref, pageType } = await router.getState();
	const activeFileUri = editor?.document.uri;

	// only `tree/blob` page will replace url with the active editor change
	if (![PageType.TREE, PageType.BLOB].includes(pageType)) {
		return;
	}

	// if the file which not belong to current workspace is opened, or no file
	// is opened, only retain `owner` and `repo` (and `ref` if need) in browser url
	if (!activeFileUri || activeFileUri?.authority || activeFileUri?.scheme !== GitHub1sFileSystemProvider.scheme) {
		const browserPath = ref.toUpperCase() === 'HEAD' ? `/${owner}/${repo}` : `/${owner}/${repo}/tree/${ref}`;
		router.history.replace({ pathname: browserPath, hash: '' });
		return;
	}

	const browserPath = `/${owner}/${repo}/blob/${ref}${activeFileUri.path}`;
	router.history.replace({ pathname: browserPath, hash: '' });
};

// if the `Open Changes` Button should show in editor title
const handleOpenChangesContextOnActiveEditorChange = async (editor: vscode.TextEditor | undefined) => {
	const changedFile = editor?.document.uri ? await getChangedFileFromSourceControl(editor.document.uri) : undefined;

	return setVSCodeContext('github1s.context.showOpenChangesInEditorTitle', !!changedFile);
};

// set the `gutterBlameOpening` to false when the active editor changed
const handleGutterBlameOpeningContextOnActiveEditorChange = async () => {
	return setVSCodeContext('github1s.context.gutterBlameOpening', false);
};

// get the line anchor hash (`#L27-L39`) from the editor.selection
const getAnchorHashFromSelection = (selection: vscode.Selection) => {
	const { start, end } = selection;

	// the cursor move to somewhere but nothing is selected
	if (start.line === end.line && start.character === end.character) {
		return '';
	}
	if (start.line === end.line) {
		return `#L${start.line + 1}`;
	}
	return `#L${start.line + 1}-L${end.line + 1}`;
};

// add the line number anchor when user selection lines in a editor
const handleRouterOnTextEditorSelectionChange = async (editor: vscode.TextEditor) => {
	const { owner, repo, ref, pageType } = await router.getState();

	// only add the line number anchor when pageType is PageType.BLOB
	if (pageType !== PageType.BLOB || !editor.selection) {
		return;
	}

	const activeFileUri = editor?.document.uri;
	const anchorText = getAnchorHashFromSelection(editor.selection);
	const browserPath = `/${owner}/${repo}/blob/${ref}${activeFileUri.path}`;

	router.history.replace({ pathname: browserPath, hash: anchorText });
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
