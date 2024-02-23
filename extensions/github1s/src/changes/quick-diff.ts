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
	const routeState = await router.getState();
	const currentScheme = adapterManager.getCurrentScheme();
	const repository = Repository.getInstance(currentScheme, routeState.repo);
	const codeReviewFiles = await repository.getCodeReviewChangedFiles(codeReviewId);
	const changedFile = codeReviewFiles?.find((changedFile) => changedFile.path === uri.path.slice(1));

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

	const originalAuthority = `${routeState.repo}+${codeReview!.targetSha}`;
	const originalPath = changedFile.previousPath ? `/${changedFile.previousPath}` : uri.path;

	return uri.with({ authority: originalAuthority, path: originalPath });
};

// get the original source uri when the `routerState.pageType` is `PageType.COMMIT`
const getOriginalResourceForCommit = async (uri: vscode.Uri, commitSha: string) => {
	const routeState = await router.getState();
	const currentScheme = adapterManager.getCurrentScheme();
	const repository = Repository.getInstance(currentScheme, routeState.repo);
	const commitFiles = await repository.getCommitChangedFiles(commitSha);
	const changedFile = commitFiles?.find((changedFile) => changedFile.path === uri.path.slice(1));

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

	const originalAuthority = `${routeState.repo}+${parentCommitSha}`;
	const originalPath = changedFile.previousPath ? `/${changedFile.previousPath}` : uri.path;

	return uri.with({ authority: originalAuthority, path: originalPath });
};

export class GitHub1sQuickDiffProvider implements vscode.QuickDiffProvider {
	provideOriginalResource(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Uri> {
		if (uri.scheme !== adapterManager.getCurrentScheme()) {
			return null;
		}

		return router.getState().then(async (routerState) => {
			// only the file belong to current authority could be provided a quick diff
			if (uri.authority && uri.authority !== (await router.getAuthority())) {
				return null;
			}

			if (routerState.pageType === adapterTypes.PageType.CodeReview) {
				return getOriginalResourceForPull(uri, routerState.codeReviewId);
			}

			if (routerState.pageType === adapterTypes.PageType.Commit) {
				return getOriginalResourceForCommit(uri, routerState.commitSha);
			}

			return null;
		});
	}
}
