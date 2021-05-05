/**
 * @file Editor Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import router from '@/router';
import repository from '@/repository';
import { emptyFileUri } from '@/providers';
import { basename } from '@/helpers/util';
import {
	ChangedFile,
	getChangedFiles,
	getChangedFileCommand,
	getChangedFileDiffTitle,
} from '@/source-control/changes';
import { FileChangeType } from '@/repository/types';

export const getChangedFileFromSourceControl = async (
	fileUri: vscode.Uri
): Promise<ChangedFile | undefined> => {
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
export const commandEditorViewOpenChanges = async (fileUri: vscode.Uri) => {
	const changedFile = await getChangedFileFromSourceControl(fileUri);

	if (!changedFile) {
		return;
	}

	const command = await getChangedFileCommand(changedFile);
	vscode.commands.executeCommand(command.command, ...command.arguments);
};

const openFileToEditor = async (fileUri) => {
	const isCurrentAuthority =
		fileUri.authority === (await router.getAuthority());

	// In order to make the file explorer focus corresponding file when
	// the `fileUri.authority` equals `current authority`, set the
	// `fileUri.authority` to '' in this case
	const targetFileUri = isCurrentAuthority
		? fileUri.with({ authority: '' })
		: fileUri;

	let editorLabel = undefined;
	if (!isCurrentAuthority) {
		// the authority here should be `{owner}+{repo}+{commitSha}`
		const [_owner, _repo, commitSha] = targetFileUri.authority.split('+');
		editorLabel = `${basename(targetFileUri.path)} (${commitSha.slice(0, 7)})`;
	}

	return vscode.commands.executeCommand(
		'vscode.open',
		targetFileUri,
		{ preview: false },
		editorLabel
	);
};

// open the left file in the diff editor title
export const commandDiffViewOpenLeftFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	if (!query.base) {
		return;
	}
	return openFileToEditor(vscode.Uri.parse(query.base as string));
};

// open the right file in the diff editor title
export const commandDiffViewOpenRightFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	if (!query.head) {
		return;
	}
	return openFileToEditor(vscode.Uri.parse(query.head as string));
};

// get the file uri with the latest commit, the `ref` in
// `fileUri.authority` maybe newer but not related this file
const getLatestFileUri = async (fileUri: vscode.Uri) => {
	// the `fileUri.authority` maybe empty, fallback
	// to router.getAuthority() in this case
	const fileAuthority = fileUri.authority || (await router.getAuthority());
	const [owner, repo, ref] = fileAuthority.split('+').filter(Boolean);
	const latestCommitSha = await repository
		.getCommitManager()
		.getFileCommitSha(fileUri.path, ref);

	return fileUri.with({
		authority: `${owner}+${repo}+${latestCommitSha}`,
	});
};

// show the file's diff between current commit and previous commit
export const commandEditorViewOpenPrevRevision = async (
	fileUri: vscode.Uri
) => {
	const queryBaseUriStr = queryString.parse(fileUri.query).base;
	const rightFileUri = await getLatestFileUri(
		// if the `queryBaseUriStr` is empty, which means this command
		// is called from a normal file editor (not a diff editor),
		// just use `fileUri` in this case
		queryBaseUriStr ? vscode.Uri.parse(queryBaseUriStr as string) : fileUri
	);

	const [owner, repo, rightCommitSha] = rightFileUri.authority
		.split('+')
		.filter(Boolean);
	const leftCommitSha = await repository
		.getCommitManager()
		.getFilePrevCommitSha(rightFileUri.path, rightCommitSha);

	// if we can't find prevCommitSha, use the the `emptyFileUri` as the leftFileUri
	const leftFileUri = leftCommitSha
		? rightFileUri.with({ authority: `${owner}+${repo}+${leftCommitSha}` })
		: emptyFileUri;

	const changedStatus = leftCommitSha
		? FileChangeType.MODIFIED
		: FileChangeType.ADDED;

	const hasNextRevision = !!(await repository
		.getCommitManager()
		.getFileNextCommitSha(rightFileUri.path, rightCommitSha));

	const query = queryString.stringify({
		base: leftFileUri.with({ query: '' }).toString(),
		head: rightFileUri.with({ query: '' }).toString(),
		status: changedStatus,
		// if we can't find a newer commit for this file,
		// the `Show Next Commit` Button would be disabled.
		hasNextRevision,
	});
	const title = getChangedFileDiffTitle(
		leftFileUri,
		rightFileUri,
		changedStatus
	);

	return vscode.commands.executeCommand(
		'vscode.diff',
		leftFileUri.with({ query }),
		rightFileUri.with({ query }),
		title
	);
};

// show the file's diff between current commit and next commit
export const commandEditorViewOpenNextRevision = async (
	fileUri: vscode.Uri
) => {
	const leftFileUri = await getLatestFileUri(fileUri);

	const [owner, repo, leftCommitSha] = leftFileUri.authority
		.split('+')
		.filter(Boolean);
	const rightCommitSha = await repository
		.getCommitManager()
		.getFileNextCommitSha(leftFileUri.path, leftCommitSha);

	if (!rightCommitSha) {
		return vscode.window.showInformationMessage(
			'There is no next commit found.'
		);
	}

	const rightFileUri = leftFileUri.with({
		authority: `${owner}+${repo}+${rightCommitSha}`,
	});

	const hasNextRevision = !!(await repository
		.getCommitManager()
		.getFileNextCommitSha(rightFileUri.path, rightCommitSha));
	const query = queryString.stringify({
		base: leftFileUri.with({ query: '' }).toString(),
		head: rightFileUri.with({ query: '' }).toString(),
		status: FileChangeType.MODIFIED,
		hasNextRevision,
	});
	const title = getChangedFileDiffTitle(
		leftFileUri,
		rightFileUri,
		FileChangeType.MODIFIED
	);

	return vscode.commands.executeCommand(
		'vscode.diff',
		leftFileUri.with({ query }),
		rightFileUri.with({ query }),
		title
	);
};
