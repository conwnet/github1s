/**
 * @file url listener for file Explorer
 * @author netcon
 */

import * as vscode from 'vscode';
import { PageType, RouterState } from '@/adapters/types';
import { GitHub1sFileSearchProvider } from '@/providers/file-search';
import { GitHub1sSubmoduleDecorationProvider } from '@/providers/decorations/submodule';
import { GitHub1sChangedFileDecorationProvider } from '@/providers/decorations/changed-file';
import { GitHub1sSourceControlDecorationProvider } from '@/providers/decorations/source-control';

const sortedEqual = (source: any[], target: any[]) => {
	const sortedSource = source.sort();
	const sortedTarget = target.sort();
	return sortedSource.every((item, index) => item === sortedTarget[index]);
};

const shouldRefreshExplorerState = (currentState: RouterState, previousState: RouterState) => {
	if (['repo', 'ref'].find((key) => currentState[key] !== previousState[key])) {
		return true;
	}

	if (
		currentState.pageType !== previousState.pageType &&
		// when the pageType transform to each other between Tree and Blob,
		// don't refresh the explorer state
		!sortedEqual([currentState.pageType, previousState.pageType], [PageType.Tree, PageType.Blob])
	) {
		return true;
	}

	return false;
};

export const explorerRouterListener = (currentState: RouterState, previousState: RouterState) => {
	if (shouldRefreshExplorerState(currentState, previousState)) {
		vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
		// TODO: maybe we should update the editors but not close it
		vscode.commands.executeCommand('workbench.action.closeAllGroups');

		GitHub1sChangedFileDecorationProvider.getInstance().updateDecorations();
		GitHub1sSubmoduleDecorationProvider.getInstance().updateDecorations();
		GitHub1sSourceControlDecorationProvider.getInstance().updateDecorations();
		GitHub1sFileSearchProvider.getInstance().loadFilesForCurrentAuthority();
	}
};
