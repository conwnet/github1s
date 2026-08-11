/**
 * @file GitHub1s quickDiffProvider for pull/commit change files
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { Repository } from '@/repository';
import { emptyFileUri } from '@/providers';
import adapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';

// get the original source uri when the `routerState.pageType` is `PageType.PULL`
const getOriginalResourceForPull = async (uri: vscode.Uri, codeReviewId: string): Promise<vscode.Uri | null> => {
	const repository = await Repository.getCurrentInstance();
	const codeReviewFiles = await repository.getCodeReviewChangedFiles(codeReviewId);
	const changedFile = codeReviewFiles?.find((changedFile) => changedFile.path === uri.path);

	if (
		!changedFile ||
		changedFile.status === adapterTypes.FileChangeStatus.Added ||
		changedFile.status === adapterTypes.FileChangeStatus.Removed
	) {
		return null;
	}

	const codeReview = await repository.getCodeReviewItem(codeReviewId);
	if (!codeReview?.targetSha) {
		return null;
	}

	return router.buildUri({
		ref: codeReview.targetSha,
		path: changedFile.previousPath || uri.path,
	});
};

// get the original source uri when the `routerState.pageType` is `PageType.COMMIT`
const getOriginalResourceForCommit = async (uri: vscode.Uri, commitSha: string) => {
	const repository = Repository.getCurrentInstance();
	const commitFiles = await repository.getCommitChangedFiles(commitSha);
	const changedFile = commitFiles?.find((changedFile) => changedFile.path === uri.path);

	if (
		!changedFile ||
		changedFile.status === adapterTypes.FileChangeStatus.Added ||
		changedFile.status === adapterTypes.FileChangeStatus.Removed
	) {
		return null;
	}

	const commit = await repository.getCommitItem(commitSha);
	const parentCommitSha = commit?.parents?.[0];
	if (!parentCommitSha) {
		return emptyFileUri;
	}

	return router.buildUri({
		ref: parentCommitSha,
		path: changedFile.previousPath || uri.path,
	});
};

export class GitHub1sQuickDiffProvider implements vscode.QuickDiffProvider {
	provideOriginalResource(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Uri> {
		const routerState = router.getState();
		// only the file belong to current workspace could be provided a quick diff
		if (uri.scheme !== routerState.scheme || uri.authority) {
			return null;
		}

		if (routerState.pageType === adapterTypes.PageType.CodeReview) {
			return getOriginalResourceForPull(uri, routerState.codeReviewId);
		}

		if (routerState.pageType === adapterTypes.PageType.Commit) {
			return getOriginalResourceForCommit(uri, routerState.commitSha);
		}

		return null;
	}
}
