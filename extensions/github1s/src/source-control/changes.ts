/**
 * @file source control change file list
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import repository from '@/repository';
import * as adapterTypes from '@/adapters/types';
import platformAdapterManager from '@/adapters/manager';
import router from '@/router';
import { basename } from '@/helpers/util';
import { emptyFileUri } from '@/providers';
import { GitHub1sQuickDiffProvider } from './quickDiffProviders';

export interface ChangedFile {
	baseFileUri: vscode.Uri;
	headFileUri: vscode.Uri;
	status: adapterTypes.FileChangeStatus;
}

// get the change files of a codeReview
export const getCodeReviewChangedFiles = async (codeReview: adapterTypes.CodeReview) => {
	const currentAdapter = platformAdapterManager.getCurrentAdapter();
	const dataSource = await currentAdapter.resolveDataSource();
	const { repo } = await router.getState();
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: currentAdapter.scheme,
		authority: `${repo}+${codeReview.base.commitSha}`,
		path: '/',
	});
	const headRootUri = baseRootUri.with({
		authority: `${repo}+${codeReview.head.commitSha}`,
	});
	const codeReviewDetail = await dataSource.provideCodeReview(repo, codeReview.id);

	return codeReviewDetail.files.map((changedFile) => {
		// the `previous_filename` field only exists in `RENAMED` file,
		// fallback to `filename` otherwise
		const baseFilePath = changedFile.previousPath || changedFile.path;
		const headFilePath = changedFile.path;
		return {
			baseFileUri: vscode.Uri.joinPath(baseRootUri, baseFilePath),
			headFileUri: vscode.Uri.joinPath(headRootUri, headFilePath),
			status: changedFile.status,
		};
	});
};

export const getCommitChangedFiles = async (commit: adapterTypes.Commit) => {
	const currentAdapter = platformAdapterManager.getCurrentAdapter();
	const dataSource = await currentAdapter.resolveDataSource();
	const { repo } = await router.getState();
	// if the commit.parents is more than one element
	// the parents[1].sha should be the merge source commitSha
	// So we use the parents[0].sha as the parent commitSha
	const baseRef = commit?.parents?.[0]?.sha;
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: currentAdapter.scheme,
		authority: `${repo}+${baseRef || 'HEAD'}`,
		path: '/',
	});
	const headRootUri = baseRootUri.with({
		authority: `${repo}+${commit.sha || 'HEAD'}`,
	});
	const commitDetail = await dataSource.provideCommit(repo, commit.sha);

	return commitDetail.files.map((commitFile) => {
		// the `previous_filename` field only exists in `RENAMED` file,
		// fallback to `filename` otherwise
		const baseFilePath = commitFile.previousPath || commitFile.path;
		const headFilePath = commitFile.path;
		return {
			baseFileUri: vscode.Uri.joinPath(baseRootUri, baseFilePath),
			headFileUri: vscode.Uri.joinPath(headRootUri, headFilePath),
			status: commitFile.status,
		};
	});
};

export const getChangedFiles = async (): Promise<ChangedFile[]> => {
	const routerState = await router.getState();
	const currentAdapter = platformAdapterManager.getCurrentAdapter();
	const dataSource = await currentAdapter.resolveDataSource();

	// github pull page
	if (routerState.type === adapterTypes.PageType.CODE_REVIEW) {
		const codeReview = await dataSource.provideCodeReview(routerState.repo, routerState.codeReviewId);
		return codeReview ? getCodeReviewChangedFiles(codeReview) : [];
	}
	// github commit page
	else if (routerState.type === adapterTypes.PageType.COMMIT) {
		const commit = await dataSource.provideCommit(routerState.repo, routerState.commitSha);
		return commit ? getCommitChangedFiles(commit) : [];
	}
	return [];
};

// get the title of the diff editor
export const getChangedFileDiffTitle = (
	baseFileUri: vscode.Uri,
	headFileUri: vscode.Uri,
	status: adapterTypes.FileChangeStatus
) => {
	const baseFileName = basename(baseFileUri.path);
	const headFileName = basename(headFileUri.path);
	const [_owner, _repo, baseCommitSha] = baseFileUri.authority.split('+');
	const [__owner, __repo, headCommitSha] = headFileUri.authority.split('+');
	const baseFileLabel = `${baseFileName} (${baseCommitSha?.slice(0, 7)})`;
	const headFileLabel = `${headFileName} (${headCommitSha?.slice(0, 7)})`;

	if (status === adapterTypes.FileChangeStatus.ADDED) {
		return `${headFileName} (added in ${headCommitSha.slice(0, 7)})`;
	}

	if (status === adapterTypes.FileChangeStatus.REMOVED) {
		return `${baseFileName} (deleted from ${baseCommitSha.slice(0, 7)})`;
	}

	return `${baseFileLabel} ⟷ ${headFileLabel}`;
};

export const getChangedFileCommand = (changedFile: ChangedFile) => {
	let baseFileUri = changedFile.baseFileUri;
	let headFileUri = changedFile.headFileUri;
	const status = changedFile.status;

	if (status === adapterTypes.FileChangeStatus.ADDED) {
		baseFileUri = emptyFileUri;
	}

	if (status === adapterTypes.FileChangeStatus.REMOVED) {
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
					strikeThrough: changedFile.status === adapterTypes.FileChangeStatus.REMOVED,
					tooltip: changedFile.status,
				},
				command: getChangedFileCommand(changedFile),
			};
		});
	};
})();
