/**
 * @file Source Control Changed Files
 * @author netcon
 */

import * as vscode from 'vscode';
import * as adapterTypes from '@/adapters/types';
import { GitHub1sQuickDiffProvider } from './quick-diff';
import { getChangedFileDiffCommand, getChangedFiles } from './files';
import adapterManager from '@/adapters/manager';

export const updateSourceControlChanges = (() => {
	const rootUri = vscode.Uri.parse('').with({ scheme: adapterManager.getCurrentScheme() });
	const sourceControl = vscode.scm.createSourceControl('github1s', 'GitHub1s', rootUri);
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
