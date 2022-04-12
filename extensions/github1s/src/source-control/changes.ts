/**
 * @file source control change file list
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import * as adapterTypes from '@/adapters/types';
import adapterManager from '@/adapters/manager';
import router from '@/router';
import { basename } from '@/helpers/util';
import { emptyFileUri } from '@/providers';
import { GitHub1sQuickDiffProvider } from './quickDiffProviders';
import { Repository } from '@/repository';

interface VSCodeChangedFile {
	baseFileUri: vscode.Uri;
	headFileUri: vscode.Uri;
	status: adapterTypes.FileChangeStatus;
}

// get the change files of a codeReview
export const getCodeReviewChangedFiles = async (codeReview: adapterTypes.CodeReview) => {
	const scheme = adapterManager.getCurrentScheme();
	const { repo } = await router.getState();
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: scheme,
		authority: `${repo}+${codeReview.base.commitSha}`,
		path: '/',
	});
	const headRootUri = baseRootUri.with({
		authority: `${repo}+${codeReview.head.commitSha}`,
	});
	const repository = Repository.getInstance(scheme, repo);
	const changedFiles = await repository.getCodeReviewChangedFiles(codeReview.id);

	return changedFiles.map((changedFile) => {
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
	const currentAdapter = adapterManager.getCurrentAdapter();
	const scheme = currentAdapter.scheme;
	const { repo } = await router.getState();
	// if the commit.parents is more than one element
	// the parents[1].sha should be the merge source commitSha
	// so we use the parents[0].sha as the parent commitSha
	const baseRef = commit?.parents?.[0]?.sha;
	const baseRootUri = vscode.Uri.parse('').with({
		scheme: currentAdapter.scheme,
		authority: `${repo}+${baseRef || 'HEAD'}`,
		path: '/',
	});
	const headRootUri = baseRootUri.with({
		authority: `${repo}+${commit.sha || 'HEAD'}`,
	});
	const repository = Repository.getInstance(scheme, repo);
	const changedFiles = await repository.getCommitChangedFiles(commit.sha);

	return changedFiles.map((commitFile) => {
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

export const getChangedFiles = async (): Promise<VSCodeChangedFile[]> => {
	const routerState = await router.getState();
	const scheme = adapterManager.getCurrentScheme();

	// code review page
	if (routerState.pageType === adapterTypes.PageType.CodeReview) {
		const repository = Repository.getInstance(scheme, routerState.repo);
		const codeReview = await repository.getCodeReviewItem(routerState.codeReviewId);
		return codeReview ? getCodeReviewChangedFiles(codeReview) : [];
	}
	// commit page
	else if (routerState.pageType === adapterTypes.PageType.Commit) {
		const repository = Repository.getInstance(scheme, routerState.repo);
		const commit = await repository.getCommitItem(routerState.commitSha);
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
	const [_repo, baseCommitSha] = baseFileUri.authority.split('+');
	const [__repo, headCommitSha] = headFileUri.authority.split('+');
	const baseFileLabel = `${baseFileName} (${baseCommitSha?.slice(0, 7)})`;
	const headFileLabel = `${headFileName} (${headCommitSha?.slice(0, 7)})`;

	if (status === adapterTypes.FileChangeStatus.Added) {
		return `${headFileName} (added in ${headCommitSha?.slice(0, 7)})`;
	}

	if (status === adapterTypes.FileChangeStatus.Removed) {
		return `${baseFileName} (deleted from ${baseCommitSha?.slice(0, 7)})`;
	}

	return `${baseFileLabel} ⟷ ${headFileLabel}`;
};

export const getChangedFileDiffCommand = (changedFile: VSCodeChangedFile): vscode.Command => {
	let baseFileUri = changedFile.baseFileUri;
	let headFileUri = changedFile.headFileUri;
	const status = changedFile.status;

	if (status === adapterTypes.FileChangeStatus.Added) {
		baseFileUri = emptyFileUri;
	}

	if (status === adapterTypes.FileChangeStatus.Removed) {
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
					strikeThrough: changedFile.status === adapterTypes.FileChangeStatus.Removed,
					tooltip: changedFile.status,
				},
				command: getChangedFileDiffCommand(changedFile),
			};
		});
	};
})();
