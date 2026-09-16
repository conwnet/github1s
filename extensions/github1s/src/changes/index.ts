/**
 * @file Source Control Changed Files
 * @author netcon
 */

import * as vscode from 'vscode';
import * as adapterTypes from '@/adapters/types';
import { getExtensionContext } from '@/helpers/context';
import { GitHub1sQuickDiffProvider } from './quick-diff';
import { getChangedFileDiffCommand, getChangedFiles } from './files';
import { GitHub1sHistoryProvider } from './history';

const sourceControl = vscode.scm.createSourceControl('github1s', 'GitHub1s');
const changesGroup = sourceControl.createResourceGroup('changes', 'Changes');
sourceControl.quickDiffProvider = new GitHub1sQuickDiffProvider();

export const registerSourceControlHistory = () => {
	const context = getExtensionContext();
	const historyProvider = new GitHub1sHistoryProvider();
	sourceControl.historyProvider = historyProvider;
	context.subscriptions.push(sourceControl, historyProvider);
	historyProvider.refresh();
};

export const updateSourceControlChanges = async () => {
	const changedFiles = await getChangedFiles();

	changesGroup.resourceStates = changedFiles.map((changedFile) => {
		return {
			resourceUri: changedFile.headFileUri.with({ authority: '' }),
			decorations: {
				strikeThrough: changedFile.status === adapterTypes.FileChangeStatus.Removed,
				tooltip: changedFile.status,
			},
			command: getChangedFileDiffCommand(changedFile),
		};
	});
};
