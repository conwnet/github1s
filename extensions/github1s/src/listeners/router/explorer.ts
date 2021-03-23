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
import { RouterState } from '@/router/types';

export const explorerRouterListener = (
	currentState: RouterState,
	previousState: RouterState
) => {
	if (
		currentState.owner !== previousState.owner ||
		currentState.repo !== previousState.repo ||
		currentState.ref !== previousState.ref
	) {
		// should update the explorer
		vscode.commands.executeCommand(
			'workbench.files.action.refreshFilesExplorer'
		);
		// TODO: maybe we should update the editors but not close it
		vscode.commands.executeCommand('workbench.action.closeAllGroups');

		changedFileDecorationProvider.updateDecorations();
		submoduleDecorationProvider.updateDecorations();
		sourceControlDecorationProvider.updateDecorations();
		fileSearchProvider.loadFuzeForCurrentAuthority();
	}
};
