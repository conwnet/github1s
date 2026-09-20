/**
 * @file Editor Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import queryString from 'query-string';
import router from '@/router';
import { emptyFileUri } from '@/providers';
import { supportsCommitFeatures } from '@/adapters';
import { FileChangeStatus } from '@/adapters/types';
import { Repository } from '@/repository';
import { getChangedFiles, getChangedFileDiffCommand, getChangedFileDiffTitle } from '@/changes/files';
import { omit } from '@/helpers/util';

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

const isRepositoryFileUri = async (uri: vscode.Uri | undefined): Promise<boolean> => {
	return !!uri && supportsCommitFeatures(uri.scheme);
};

const getActiveDiffInput = (resource?: vscode.Uri): vscode.TabInputTextDiff | undefined => {
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	if (!(input instanceof vscode.TabInputTextDiff)) {
		return;
	}

	// Title actions receive the modified URI. Ignore actions targeting another diff.
	if (resource && resource.toString() !== input.modified.toString()) {
		return;
	}
	return input;
};

const createCommandDiffViewOpenFile = (side: 'original' | 'modified') => async (resource?: vscode.Uri) => {
	const fileUri = getActiveDiffInput(resource)?.[side];
	if (fileUri && fileUri?.scheme !== emptyFileUri.scheme) {
		await vscode.commands.executeCommand('workbench.action.keepEditor');
		return vscode.commands.executeCommand('vscode.open', fileUri, {});
	}
};

const resolveOpenFileRevisionArgs = async (
	fileUri: vscode.Uri | undefined,
	direction: 'previous' | 'next',
): Promise<[vscode.Uri, string]> => {
	let baseUri: vscode.Uri | undefined, from: string | undefined;
	const getQueryFrom = (uri: vscode.Uri): string | undefined => {
		return queryString.parse(uri.query).from as string | undefined;
	};

	const textDiffInput = getActiveDiffInput(fileUri);
	if (textDiffInput) {
		// this is a diff editor
		const { original, modified } = textDiffInput;
		const [hasLeftFile, hasRightFile] = await Promise.all([
			isRepositoryFileUri(original),
			isRepositoryFileUri(modified),
		]);

		if (direction === 'previous' && hasLeftFile) {
			baseUri = original;
		}
		if (direction === 'next' && hasRightFile) {
			baseUri = modified;
		}
		if (hasRightFile) {
			from = getQueryFrom(modified);
		}
	} else if (fileUri && (await isRepositoryFileUri(fileUri))) {
		// this is a single file editor
		from = getQueryFrom(fileUri);
		baseUri = fileUri;
	}

	if (!baseUri) {
		throw new Error('Unable to resolve the target file.');
	}

	if (!from) {
		// If 'from' cannot be obtained in the query, use the ref of baseUri as 'from'
		const { scheme, repo, ref, path } = router.parseUri(baseUri);
		const repository = Repository.getInstance(scheme, repo);
		from = (await repository.getFileLatestCommit(ref, path))?.sha;
		if (!from) {
			throw new Error('Unable to resolve the latest commit for this file.');
		}
		baseUri = router.buildUri({ ref: from }, baseUri);
	}

	return [baseUri, from];
};

const createCommandOpenFileRevision = (direction: 'previous' | 'next') => async (fileUri?: vscode.Uri) => {
	try {
		const [baseUri, from] = await resolveOpenFileRevisionArgs(fileUri, direction);
		const { scheme, repo, ref, path } = router.parseUri(baseUri);
		const repository = Repository.getInstance(scheme, repo);
		const baseSha = (await repository.getCommitItem(ref))?.sha;
		if (!baseSha) {
			throw new Error('Unable to resolve the commit for this file.');
		}

		let leftFileUri: vscode.Uri | undefined, rightFileUri: vscode.Uri | undefined;
		if (direction === 'previous') {
			const prevCommit = await repository.getPreviousCommit(baseSha, path, from);
			leftFileUri = prevCommit ? router.buildUri({ ref: prevCommit.sha }, baseUri) : emptyFileUri;
			rightFileUri = baseUri;
		} else {
			const nextCommit = await repository.getNextCommit(baseSha, path, from);
			if (!nextCommit) throw new Error('Unable to find next commit for this file.');
			leftFileUri = baseUri;
			rightFileUri = router.buildUri({ ref: nextCommit.sha }, baseUri);
		}

		const hasNext = router.parseUri(rightFileUri).ref !== from || undefined;
		const leftQuery = queryString.stringify(omit(queryString.parse(baseUri.query), ['from']));
		const rightQuery = queryString.stringify({ ...queryString.parse(baseUri.query), from, hasNext });

		if (fileUri && !queryString.parse(fileUri.query).from) {
			await vscode.commands.executeCommand('workbench.action.keepEditor');
		}

		return await vscode.commands.executeCommand(
			'vscode.diff',
			leftFileUri.with({ query: leftQuery }),
			rightFileUri.with({ query: rightQuery }),
			getChangedFileDiffTitle(leftFileUri, rightFileUri, FileChangeStatus.Modified),
		);
	} catch (error) {
		return vscode.window.showErrorMessage(`Unable to open file revision: ${error.message}`);
	}
};

export const registerEditorCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.diffChangedFile', commandDiffChangedFile),
		vscode.commands.registerCommand(
			'github1s.commands.diffViewOpenLeftFile',
			createCommandDiffViewOpenFile('original'),
		),
		vscode.commands.registerCommand(
			'github1s.commands.diffViewOpenRightFile',
			createCommandDiffViewOpenFile('modified'),
		),
		vscode.commands.registerCommand(
			'github1s.commands.openFilePreviousRevision',
			createCommandOpenFileRevision('previous'),
		),
		vscode.commands.registerCommand('github1s.commands.openFileNextRevision', createCommandOpenFileRevision('next')),
	);
};
