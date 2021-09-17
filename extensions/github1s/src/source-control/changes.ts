/**
 * @file source control change file list
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import repository from '@/repository';
import { FileChangeType, RepositoryCommit, RepositoryPull } from '@/repository/types';
import router from '@/router';
import { basename } from '@/helpers/util';
import { emptyFileUri } from '@/providers';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';
import { PageType } from '@/router/types';
import { GitHub1sQuickDiffProvider } from './quickDiffProviders';

export interface ChangedFile {
	baseFileUri: vscode.Uri;
	headFileUri: vscode.Uri;
	status: FileChangeType;
}

// get the change files of a pull
export const getPullChangedFiles = async (pull: RepositoryPull) => {
	const { owner, repo } = await router.getState();
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: GitHub1sFileSystemProvider.scheme,
		authority: `${owner}+${repo}+${pull.base.sha}`,
		path: '/',
	});
	const headRootUri = baseRootUri.with({
		authority: `${owner}+${repo}+${pull.head.sha}`,
	});
	const pullFiles = await repository.getPullManager().getPullFiles(pull.number);

	return pullFiles.map((pullFile) => {
		// the `previous_filename` field only exists in `RENAMED` file,
		// fallback to `filename` otherwise
		const baseFilePath = pullFile.previous_filename || pullFile.filename;
		const headFilePath = pullFile.filename;
		return {
			baseFileUri: vscode.Uri.joinPath(baseRootUri, baseFilePath),
			headFileUri: vscode.Uri.joinPath(headRootUri, headFilePath),
			status: pullFile.status,
		};
	});
};

export const getCommitChangedFiles = async (commit: RepositoryCommit) => {
	const { owner, repo } = await router.getState();
	// if the commit.parents is more than one element
	// the parents[1].sha should be the merge source commitSha
	// So we use the parents[0].sha as the parent commitSha
	const baseRef = commit?.parents?.[0]?.sha;
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: GitHub1sFileSystemProvider.scheme,
		authority: `${owner}+${repo}+${baseRef || 'HEAD'}`,
		path: '/',
	});
	const headRootUri = baseRootUri.with({
		authority: `${owner}+${repo}+${commit.sha || 'HEAD'}`,
	});
	const commitFiles = await repository.getCommitManager().getCommitFiles(commit.sha);

	return commitFiles.map((commitFile) => {
		// the `previous_filename` field only exists in `RENAMED` file,
		// fallback to `filename` otherwise
		const baseFilePath = commitFile.previous_filename || commitFile.filename;
		const headFilePath = commitFile.filename;
		return {
			baseFileUri: vscode.Uri.joinPath(baseRootUri, baseFilePath),
			headFileUri: vscode.Uri.joinPath(headRootUri, headFilePath),
			status: commitFile.status,
		};
	});
};

export const getChangedFiles = async (): Promise<ChangedFile[]> => {
	const routerState = await router.getState();

	// github pull page
	if (routerState.pageType === PageType.PULL) {
		const pull = await repository.getPullManager().getItem(routerState.pullNumber);
		return pull ? getPullChangedFiles(pull) : [];
	}
	// github commit page
	else if (routerState.pageType === PageType.COMMIT) {
		const commit = await repository.getCommitManager().getItem(routerState.commitSha);
		return commit ? getCommitChangedFiles(commit) : [];
	}
	return [];
};

// get the title of the diff editor
export const getChangedFileDiffTitle = (baseFileUri: vscode.Uri, headFileUri: vscode.Uri, status: FileChangeType) => {
	const baseFileName = basename(baseFileUri.path);
	const headFileName = basename(headFileUri.path);
	const [_owner, _repo, baseCommitSha] = baseFileUri.authority.split('+');
	const [__owner, __repo, headCommitSha] = headFileUri.authority.split('+');
	const baseFileLabel = `${baseFileName} (${baseCommitSha?.slice(0, 7)})`;
	const headFileLabel = `${headFileName} (${headCommitSha?.slice(0, 7)})`;

	if (status === FileChangeType.ADDED) {
		return `${headFileName} (added in ${headCommitSha.slice(0, 7)})`;
	}

	if (status === FileChangeType.REMOVED) {
		return `${baseFileName} (deleted from ${baseCommitSha.slice(0, 7)})`;
	}

	return `${baseFileLabel} ⟷ ${headFileLabel}`;
};

export const getChangedFileCommand = (changedFile: ChangedFile) => {
	let baseFileUri = changedFile.baseFileUri;
	let headFileUri = changedFile.headFileUri;
	const status = changedFile.status;

	if (status === FileChangeType.ADDED) {
		baseFileUri = emptyFileUri;
	}

	if (status === FileChangeType.REMOVED) {
		headFileUri = emptyFileUri;
	}

	const title = getChangedFileDiffTitle(baseFileUri, headFileUri, status);
	const query = queryString.stringify({
		status,
		base: baseFileUri.with({ query: '' }).toString(),
		head: headFileUri.with({ query: '' }).toString(),
	});

	return {
		title: 'Diff',
		command: 'vscode.diff',
		arguments: [baseFileUri.with({ query }), headFileUri.with({ query }), title],
	};
};

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
					strikeThrough: changedFile.status === FileChangeType.REMOVED,
					tooltip: changedFile.status,
				},
				command: getChangedFileCommand(changedFile),
			};
		});
	};
})();
