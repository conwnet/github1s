/**
 * @file source control change file list
 * @author netcon
 */

import * as vscode from 'vscode';
import repository, {
	FileChangeType,
	RepositoryCommit,
	RepositoryPull,
} from '@/repository';
import router from '@/router';
import { basename } from '@/helpers/util';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';
import { PageType } from '@/router/types';

export interface ChangedFile {
	baseFileUri: vscode.Uri;
	headFileUri: vscode.Uri;
	status: FileChangeType;
}

// get the change files of a pull
export const getPullChangeFiles = async (pull: RepositoryPull) => {
	const { owner, repo } = await router.getState();
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: GitHub1sFileSystemProvider.scheme,
		authority: `${owner}+${repo}+${pull.base.sha}`,
		path: '/',
		query: `pull=${pull.number}`,
	});
	const headRootUri = baseRootUri.with({
		authority: `${owner}+${repo}+${pull.head.sha}`,
	});
	const pullFiles = await repository.getPullFiles(pull.number);

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

export const getCommitChangeFiles = async (commit: RepositoryCommit) => {
	const { owner, repo } = await router.getState();
	// if the commit.parents is more than one element
	// the parents[1].sha should be the merge source commitSha
	// So we use the parents[0].sha as the parent commitSha
	const baseRef = commit?.parents?.[0]?.sha;
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: GitHub1sFileSystemProvider.scheme,
		authority: `${owner}+${repo}+${baseRef || 'HEAD'}`,
		path: '/',
		query: `commit=${commit.sha}`,
	});
	const headRootUri = baseRootUri.with({
		authority: `${owner}+${repo}+${commit.sha || 'HEAD'}`,
	});
	const commitFiles = await repository.getCommitFiles(commit.sha);

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

const getChangedFiles = async (): Promise<ChangedFile[]> => {
	const routerState = await router.getState();

	// github pull page
	if (routerState.pageType === PageType.PULL) {
		const pull = await repository.getPull(routerState.pullNumber);
		return pull ? getPullChangeFiles(pull) : [];
	}
	// github commit page
	else if (routerState.pageType === PageType.COMMIT) {
		const commit = await repository.getCommit(routerState.commitSha);
		return commit ? getCommitChangeFiles(commit) : [];
	}
	return [];
};

export const getChangedFileCommand = (changedFile: ChangedFile) => {
	const baseFileUri = changedFile.baseFileUri;
	const headFileUri = changedFile.headFileUri;

	if (changedFile.status === FileChangeType.ADDED) {
		const title = `${basename(headFileUri.path)} (Added)`;
		return {
			title: 'Open',
			command: 'vscode.open',
			arguments: [headFileUri, {}, title],
		};
	}
	if (changedFile.status === FileChangeType.REMOVED) {
		const title = `${basename(baseFileUri.path)} (Deleted)`;
		return {
			title: 'Open',
			command: 'vscode.open',
			arguments: [baseFileUri, {}, title],
		};
	}
	if (changedFile.status === FileChangeType.MODIFIED) {
		const title = `${basename(headFileUri.path)} (Modified)`;
		return {
			title: 'Diff',
			command: 'vscode.diff',
			arguments: [baseFileUri, headFileUri, title],
		};
	}
	if (changedFile.status === FileChangeType.RENAMED) {
		const title = `${basename(baseFileUri.path)} -> ${basename(
			headFileUri.path
		)}`;
		return {
			title: 'Diff',
			command: 'vscode.diff',
			arguments: [baseFileUri, headFileUri, title],
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
