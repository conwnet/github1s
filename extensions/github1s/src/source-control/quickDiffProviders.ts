/**
 * @file GitHub1s quickDiffProvider for pull/commit change files
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { emptyFileUri } from '@/providers';
import platformAdapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';

// get the original source uri when the `routerState.pageType` is `PageType.PULL`
const getOriginalResourceForPull = async (uri: vscode.Uri, codeReviewId: string): Promise<vscode.Uri> => {
	const routeState = await router.getState();
	const dataSource = await platformAdapterManager.getCurrentAdapter().resolveDataSource();
	const codeReview = await dataSource.provideCodeReview(routeState.repo, codeReviewId);
	const changedFile = codeReview.files?.find((changedFile) => changedFile.path === uri.path.slice(1));

	// TODO: why removed
	if (!changedFile || changedFile.status === adapterTypes.FileChangeStatus.REMOVED) {
		return null;
	}

	if (changedFile.status === adapterTypes.FileChangeStatus.ADDED) {
		return emptyFileUri;
	}

	const originalAuthority = `${routeState.repo}+${codeReview.base.commitSha}`;
	const originalPath = changedFile.previousPath ? `/${changedFile.previousPath}` : uri.path;

	return uri.with({ authority: originalAuthority, path: originalPath });
};

// get the original source uri when the `routerState.pageType` is `PageType.COMMIT`
const getOriginalResourceForCommit = async (uri: vscode.Uri, commitSha: string) => {
	const routeState = await router.getState();
	const dataSource = await platformAdapterManager.getCurrentAdapter().resolveDataSource();
	const commit = await dataSource.provideCommit(routeState.repo, commitSha);
	const changedFile = commit.files?.find((changedFile) => changedFile.path === uri.path.slice(1));

	if (!changedFile || changedFile.status === adapterTypes.FileChangeStatus.REMOVED) {
		return null;
	}

	if (changedFile.status === adapterTypes.FileChangeStatus.ADDED) {
		return emptyFileUri;
	}

	const parentCommitSha = commit.parents?.[0]?.sha;

	if (!parentCommitSha) {
		return emptyFileUri;
	}

	const originalAuthority = `${routeState.repo}+${parentCommitSha}`;
	const originalPath = changedFile.previousPath ? `/${changedFile.previousPath}` : uri.path;

	return uri.with({ authority: originalAuthority, path: originalPath });
};

export class GitHub1sQuickDiffProvider implements vscode.QuickDiffProvider {
	provideOriginalResource(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Uri> {
		if (uri.scheme !== platformAdapterManager.getCurrentScheme()) {
			return null;
		}

		return router.getState().then(async (routerState) => {
			// only the file belong to current authority could be provided a quick diff
			if (uri.authority && uri.authority !== (await router.getAuthority())) {
				return null;
			}

			if (routerState.type === adapterTypes.PageType.CODE_REVIEW) {
				return getOriginalResourceForPull(uri, routerState.codeReviewId);
			}

			if (routerState.type === adapterTypes.PageType.COMMIT) {
				return getOriginalResourceForCommit(uri, routerState.commitSha);
			}

			return null;
		});
	}
}
