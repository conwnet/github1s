/**
 * @file Source Control Changed Files
 * @author netcon
 */

import * as vscode from 'vscode';
import * as adapterTypes from '@/adapters/types';
import { GitHub1sQuickDiffProvider } from './quick-diff';
import { getChangedFileDiffCommand, getChangedFiles } from './files';

export const updateSourceControlChanges = (() => {
	const sourceControl = vscode.scm.createSourceControl('github1s', 'GitHub1s');
	const changesGroup = sourceControl.createResourceGroup('changes', 'Changes');
	sourceControl.quickDiffProvider = new GitHub1sQuickDiffProvider();

	return async () => {
		const changedFiles = await getChangedFiles();

		changesGroup.resourceStates = changedFiles.map((changedFile) => {
			return {
				resourceUri: changedFile.headFileUri,
				decorations: {
					strikeThrough: changedFile.status === adapterTypes.FileChangeStatus.Removed,
					tooltip: changedFile.status,
				},
				command: getChangedFileDiffCommand(changedFile),
			};
		});
	};
})();
