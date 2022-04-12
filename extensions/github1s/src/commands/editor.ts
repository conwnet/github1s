/**
 * @file Editor Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import router from '@/router';
import { emptyFileUri } from '@/providers';
import { basename } from '@/helpers/util';
import { FileChangeStatus } from '@/adapters/types';
import { CommitManager } from '@/views/commit-manager';
import { getChangedFiles, getChangedFileDiffCommand, getChangedFileDiffTitle } from '@/source-control/changes';

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
	const isCurrentAuthority = fileUri.authority === (await router.getAuthority());

	// In order to make the file explorer focus corresponding file when
	// the `fileUri.authority` equals `current authority`, set the
	// `fileUri.authority` to '' in this case
	const targetFileUri = isCurrentAuthority ? fileUri.with({ authority: '' }) : fileUri;

	let editorLabel: string | undefined = undefined;
	if (!isCurrentAuthority) {
		// the authority here should be `{repo}+{commitSha}`
		const [_repo, commitSha] = targetFileUri.authority.split('+');
		editorLabel = `${basename(targetFileUri.path)} (${commitSha.slice(0, 7)})`;
	}

	return vscode.commands.executeCommand('vscode.open', targetFileUri, { preview: false }, editorLabel);
};

// open the left file in the diff editor title
const commandDiffViewOpenLeftFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	if (!query.base) {
		return;
	}
	return openFileToEditor(vscode.Uri.parse(query.base as string));
};

// open the right file in the diff editor title
const commandDiffViewOpenRightFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	if (!query.head) {
		return;
	}
	return openFileToEditor(vscode.Uri.parse(query.head as string));
};

// get the file uri with the concrete commit sha, the `ref` in
// `fileUri.authority` maybe newer but not related this file
const getConcreteFileUri = async (fileUri: vscode.Uri) => {
	// the `fileUri.authority` maybe empty, fallback to router.getAuthority() in this case
	const fileAuthority = fileUri.authority || (await router.getAuthority());
	const [repo, ref] = fileAuthority.split('+').filter(Boolean);
	const commitManager = CommitManager.getInstance(fileUri.scheme, repo);
	const commit = await commitManager.getFileLatestCommit(ref, fileUri.path.slice(1));
	const latestCommitSha = commit?.sha || (await commitManager.getItem(ref))?.sha || 'HEAD';

	return fileUri.with({ authority: `${repo}+${latestCommitSha}` });
};

// show the file's diff between current commit and previous commit
const commandOpenFilePreviousRevision = async (fileUri: vscode.Uri) => {
	const queryBaseUriStr = queryString.parse(fileUri.query).base;
	const rightFileUri = await getConcreteFileUri(
		// if the `queryBaseUriStr` is empty, which means this command is called from
		// a normal file editor (not a diff editor), just use `fileUri` in this case
		queryBaseUriStr ? vscode.Uri.parse(queryBaseUriStr as string) : fileUri
	);
	const [repo, rightCommitSha] = rightFileUri.authority.split('+').filter(Boolean);

	const commitManager = CommitManager.getInstance(fileUri.scheme, repo);
	const leftCommit = await commitManager.getPreviousCommit(rightCommitSha, fileUri.path.slice(1));
	// if we can't find previous commit, use the the `emptyFileUri` as the leftFileUri
	const leftFileUri = leftCommit ? rightFileUri.with({ authority: `${repo}+${leftCommit.sha}` }) : emptyFileUri;

	const changedStatus = leftCommit ? FileChangeStatus.Modified : FileChangeStatus.Added;
	const hasNextRevision = !!(await commitManager.getNextCommit(rightCommitSha, rightFileUri.path.slice(1)));

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
		getChangedFileDiffTitle(leftFileUri, rightFileUri, changedStatus)
	);
};

// show the file's diff between current commit and next commit
const commandOpenFileNextRevision = async (fileUri: vscode.Uri) => {
	const leftFileUri = await getConcreteFileUri(fileUri);

	const [repo, leftCommitSha] = leftFileUri.authority.split('+').filter(Boolean);
	const commitManager = CommitManager.getInstance(fileUri.scheme, repo);
	const rightCommit = await commitManager.getNextCommit(leftCommitSha, fileUri.path.slice(1));

	if (!rightCommit) {
		return vscode.window.showInformationMessage('There is no next commit found.');
	}

	const rightFileUri = leftFileUri.with({ authority: `${repo}+${rightCommit.sha}` });
	const hasNextRevision = !!(await commitManager.getNextCommit(rightCommit.sha, rightFileUri.path.slice(1)));

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
		getChangedFileDiffTitle(leftFileUri, rightFileUri, FileChangeStatus.Modified)
	);
};

export const registerEditorCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.diff-changed-file', commandDiffChangedFile),
		vscode.commands.registerCommand('github1s.commands.diff-view-open-left-file', commandDiffViewOpenLeftFile),
		vscode.commands.registerCommand('github1s.commands.diff-view-open-right-file', commandDiffViewOpenRightFile),
		vscode.commands.registerCommand('github1s.commands.open-file-previous-revision', commandOpenFilePreviousRevision),
		vscode.commands.registerCommand('github1s.commands.open-file-next-revision', commandOpenFileNextRevision)
	);
};
