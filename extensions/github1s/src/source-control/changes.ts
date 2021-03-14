/**
 * @file source control change file list
 * @author netcon
 */

import * as vscode from 'vscode';
import repository, { FileChangeType } from '@/repository';
import router from '@/router';
import { basename } from '@/helpers/util';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';
import { PageType } from '@/router/types';

interface ChangedFile {
	previousFileUri: vscode.Uri;
	currentFileUri: vscode.Uri;
	status: FileChangeType;
}

const getChangedFiles = async (): Promise<ChangedFile[]> => {
	const routerState = await router.getState();
	// current workspace root directory uri, the `ref` in uri authority should be `pull.head.sha`
	let currentRootUri = vscode.Uri.parse('').with({
		scheme: GitHub1sFileSystemProvider.scheme,
		authority: await router.getAuthority(),
		path: '/',
	});

	// github pull page
	if (routerState.pageType === PageType.PULL) {
		// record that current editor is opened by pull
		currentRootUri = currentRootUri.with({
			query: `pull=${routerState.pullNumber}`,
		});
		const { owner, repo } = await router.getState();
		const baseRef = (await repository.getPull(routerState.pullNumber)).base.sha;
		const baseRootUri = currentRootUri.with({
			authority: `${owner}+${repo}+${baseRef}`,
		});

		const pullFiles = await repository.getPullFiles(routerState.pullNumber);

		return pullFiles.map((pullFile) => {
			// the `previous_filename` field only exists in `RENAMED` file,
			// fallback to `filename` otherwise
			const previousFilePath = pullFile.previous_filename || pullFile.filename;
			const currentFilePath = pullFile.filename;

			return {
				previousFileUri: vscode.Uri.joinPath(baseRootUri, previousFilePath),
				currentFileUri: vscode.Uri.joinPath(currentRootUri, currentFilePath),
				status: pullFile.status,
			};
		});
	}
	return [];
};

const getChangedFileCommand = (changedFile: ChangedFile) => {
	const previousFileUri = changedFile.previousFileUri;
	const currentFileUri = changedFile.currentFileUri;

	if (changedFile.status === FileChangeType.ADDED) {
		const title = `${basename(currentFileUri.path)} (Added)`;
		return {
			title: 'Open',
			command: 'vscode.open',
			arguments: [currentFileUri, {}, title],
		};
	}
	if (changedFile.status === FileChangeType.REMOVED) {
		const title = `${basename(previousFileUri.path)} (Deleted)`;
		return {
			title: 'Open',
			command: 'vscode.open',
			arguments: [previousFileUri, {}, title],
		};
	}
	if (changedFile.status === FileChangeType.MODIFIED) {
		const title = `${basename(currentFileUri.path)} (Modified)`;
		return {
			title: 'Diff',
			command: 'vscode.diff',
			arguments: [previousFileUri, currentFileUri, title],
		};
	}
	if (changedFile.status === FileChangeType.RENAMED) {
		const title = `${basename(previousFileUri.path)} -> ${basename(
			currentFileUri.path
		)}`;
		return {
			title: 'Diff',
			command: 'vscode.diff',
			arguments: [previousFileUri, currentFileUri, title],
		};
	}
	return undefined;
};

export const updateSourceControlChanges = (() => {
	const sourceControl = vscode.scm.createSourceControl('github1s', 'GitHub1s');
	const changesGroup = sourceControl.createResourceGroup('changes', 'Changes');

	return async () => {
		const changedFiles = await getChangedFiles();

		changesGroup.resourceStates = changedFiles.map((changedFile) => {
			return {
				resourceUri: changedFile.currentFileUri,
				decorations: {
					strikeThrough: changedFile.status === FileChangeType.REMOVED,
					tooltip: changedFile.status,
				},
				command: getChangedFileCommand(changedFile),
			};
		});
	};
})();
