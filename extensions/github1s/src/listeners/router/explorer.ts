/**
 * @file url listener for file Explorer
 * @author netcon
 */

import * as vscode from 'vscode';
import {
	changedFileDecorationProvider,
	submoduleDecorationProvider,
	sourceControlDecorationProvider,
	fileSearchProvider,
} from '@/providers';
import { PageType, RouterState } from '@/router/types';

const sortedEqual = (source: any[], target: any[]) => {
	const sortedSource = source.sort();
	const sortedTarget = target.sort();
	return sortedSource.every((item, index) => item === sortedTarget[index]);
};

const shouldRefreshExplorerState = (
	currentState: RouterState,
	previousState: RouterState
) => {
	if (
		['owner', 'repo', 'ref'].find(
			(key) => currentState[key] !== previousState[key]
		)
	) {
		return true;
	}

	if (
		currentState.pageType !== previousState.pageType &&
		// when the pageType transform to each other between TREE and BLOB,
		// don't refresh the explorer state
		!sortedEqual(
			[currentState.pageType, previousState.pageType],
			[PageType.TREE, PageType.BLOB]
		)
	) {
		return true;
	}

	return false;
};

export const explorerRouterListener = (
	currentState: RouterState,
	previousState: RouterState
) => {
	if (shouldRefreshExplorerState(currentState, previousState)) {
		vscode.commands.executeCommand(
			'workbench.files.action.refreshFilesExplorer'
		);
		// TODO: maybe we should update the editors but not close it
		vscode.commands.executeCommand('workbench.action.closeAllGroups');

		changedFileDecorationProvider.updateDecorations();
		submoduleDecorationProvider.updateDecorations();
		sourceControlDecorationProvider.updateDecorations();
		fileSearchProvider.loadFilesForCurrentAuthority();
	}
};
