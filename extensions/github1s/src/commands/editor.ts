/**
 * @file Editor Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import router from '@/router';
import { emptyFileUri } from '@/providers';
import { FileChangeStatus } from '@/adapters/types';
import { Repository } from '@/repository';
import { getChangedFiles, getChangedFileDiffCommand, getChangedFileDiffTitle } from '@/changes/files';

export const getChangedFileFromSourceControl = async (fileUri: vscode.Uri) => {
	// the file should belong to current workspace
	if (fileUri.authority) {
		return;
	}

	return (await getChangedFiles()).find((changedFile) => {
		return changedFile.headFileUri.path === fileUri.path;
	});
};

// open the diff editor of a file, such as click it in source-control-panel,
// only work when we can found the corresponding file in source-control-panel
const commandDiffChangedFile = async (fileUri: vscode.Uri) => {
	const changedFile = await getChangedFileFromSourceControl(fileUri);

	if (!changedFile) {
		return;
	}

	const command = await getChangedFileDiffCommand(changedFile);
	vscode.commands.executeCommand(command.command, ...(command.arguments || []));
};

const openFileToEditor = async (fileUri) => {
	return vscode.commands.executeCommand('vscode.open', fileUri, { preview: false });
};

// open the left file in the diff editor title
const commandDiffViewOpenLeftFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	return query.base ? openFileToEditor(vscode.Uri.parse(query.base as string)) : null;
};

// open the right file in the diff editor title
const commandDiffViewOpenRightFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	return query.head ? openFileToEditor(vscode.Uri.parse(query.head as string)) : null;
};

// get the file uri with the concrete commit sha, the `ref` in
// `fileUri.authority` maybe newer but not related this file
const getConcreteFileUri = async (fileUri: vscode.Uri) => {
	const { ref, path } = router.parseUri(fileUri);
	const repository = Repository.getInstanceByUri(fileUri);
	const commit = await repository.getFileLatestCommit(ref, path);
	const latestCommitSha = commit?.sha || (await repository.getCommitItem(ref))?.sha;

	return router.buildUri({ ref: latestCommitSha }, fileUri);
};

// show the file's diff between current commit and previous commit
const commandOpenFilePreviousRevision = async (fileUri: vscode.Uri) => {
	const queryBaseUriStr = queryString.parse(fileUri.query).base;
	const rightFileUri = await getConcreteFileUri(
		// if the `queryBaseUriStr` is empty, which means this command is called from
		// a normal file editor (not a diff editor), just use `fileUri` in this case
		queryBaseUriStr ? vscode.Uri.parse(queryBaseUriStr as string) : fileUri,
	);
	const { repo, ref: rightCommitSha } = router.parseUri(rightFileUri);

	const repository = Repository.getInstanceByUri(rightFileUri);
	const leftCommit = await repository.getPreviousCommit(rightCommitSha, rightFileUri.path);
	// if we can't find previous commit, use the `emptyFileUri` as the leftFileUri
	const leftFileUri = leftCommit ? router.buildUri({ ref: leftCommit.sha }, rightFileUri) : emptyFileUri;

	const changedStatus = leftCommit ? FileChangeStatus.Modified : FileChangeStatus.Added;
	const hasNextRevision = !!(await repository.getNextCommit(rightCommitSha, rightFileUri.path));

	const query = queryString.stringify({
		base: leftFileUri.with({ query: '' }).toString(),
		head: rightFileUri.with({ query: '' }).toString(),
		status: changedStatus,
		// if we can't find a newer commit for this file,
		// the `Show Next Commit` Button would be disabled.
		hasNextRevision,
	});

	return vscode.commands.executeCommand(
		'vscode.diff',
		leftFileUri.with({ query }),
		rightFileUri.with({ query }),
		getChangedFileDiffTitle(leftFileUri, rightFileUri, changedStatus),
	);
};

// show the file's diff between current commit and next commit
const commandOpenFileNextRevision = async (fileUri: vscode.Uri) => {
	const leftFileUri = await getConcreteFileUri(fileUri);

	const { ref: leftCommitSha } = router.parseUri(leftFileUri);
	const repository = Repository.getInstanceByUri(leftFileUri);
	const rightCommit = await repository.getNextCommit(leftCommitSha, leftFileUri.path);

	if (!rightCommit) {
		return vscode.window.showInformationMessage('There is no next commit found.');
	}

	const rightFileUri = router.buildUri({ ref: rightCommit.sha }, leftFileUri);
	const hasNextRevision = !!(await repository.getNextCommit(rightCommit.sha, rightFileUri.path));

	const query = queryString.stringify({
		base: leftFileUri.with({ query: '' }).toString(),
		head: rightFileUri.with({ query: '' }).toString(),
		status: FileChangeStatus.Modified,
		hasNextRevision,
	});

	return vscode.commands.executeCommand(
		'vscode.diff',
		leftFileUri.with({ query }),
		rightFileUri.with({ query }),
		getChangedFileDiffTitle(leftFileUri, rightFileUri, FileChangeStatus.Modified),
	);
};

export const registerEditorCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.diffChangedFile', commandDiffChangedFile),
		vscode.commands.registerCommand('github1s.commands.diffViewOpenLeftFile', commandDiffViewOpenLeftFile),
		vscode.commands.registerCommand('github1s.commands.diffViewOpenRightFile', commandDiffViewOpenRightFile),
		vscode.commands.registerCommand('github1s.commands.openFilePreviousRevision', commandOpenFilePreviousRevision),
		vscode.commands.registerCommand('github1s.commands.openFileNextRevision', commandOpenFileNextRevision),
	);
};
