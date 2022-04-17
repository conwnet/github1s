/**
 * @file GitHub1s quickDiffProvider for pull/commit change files
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { emptyFileUri } from '@/providers';
import adapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';

// get the original source uri when the `routerState.pageType` is `PageType.PULL`
const getOriginalResourceForPull = async (uri: vscode.Uri, codeReviewId: string): Promise<vscode.Uri | null> => {
	const routeState = await router.getState();
	const dataSource = await adapterManager.getCurrentAdapter().resolveDataSource();
	const codeReview = await dataSource.provideCodeReview(routeState.repo, codeReviewId);
	const changedFile = codeReview?.files?.find((changedFile) => changedFile.path === uri.path.slice(1));

	// TODO: why removed
	if (!changedFile || changedFile.status === adapterTypes.FileChangeStatus.Removed) {
		return null;
	}

	if (changedFile.status === adapterTypes.FileChangeStatus.Added) {
		return emptyFileUri;
	}

	const originalAuthority = `${routeState.repo}+${codeReview!.base.commitSha}`;
	const originalPath = changedFile.previousPath ? `/${changedFile.previousPath}` : uri.path;

	return uri.with({ authority: originalAuthority, path: originalPath });
};

// get the original source uri when the `routerState.pageType` is `PageType.COMMIT`
const getOriginalResourceForCommit = async (uri: vscode.Uri, commitSha: string) => {
	const routeState = await router.getState();
	const dataSource = await adapterManager.getCurrentAdapter().resolveDataSource();
	const commit = await dataSource.provideCommit(routeState.repo, commitSha);
	const changedFile = commit?.files?.find((changedFile) => changedFile.path === uri.path.slice(1));

	if (!changedFile || changedFile.status === adapterTypes.FileChangeStatus.Removed) {
		return null;
	}

	if (changedFile.status === adapterTypes.FileChangeStatus.Added) {
		return emptyFileUri;
	}

	const parentCommitSha = commit!.parents?.[0] || 'HEAD';

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
