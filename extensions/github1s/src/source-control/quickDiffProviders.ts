/**
 * @file GitHub1s quickDiffProvider for pull/commit change files
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import repository from '@/repository';
import { FileChangeType } from '@/repository/types';
import { PageType } from '@/router/types';
import { emptyFileUri } from '@/providers';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';

// get the original source uri when the `routerState.pageType` is `PageType.PULL`
const getOriginalResourceForPull = async (
	uri: vscode.Uri,
	pullNumber: number
): Promise<vscode.Uri> => {
	const changedFiles = await repository
		.getPullManager()
		.getPullFiles(pullNumber);
	const changedFile = changedFiles?.find(
		(changedFile) => changedFile.filename === uri.path.slice(1)
	);

	if (!changedFile || changedFile.status === FileChangeType.REMOVED) {
		return null;
	}

	if (changedFile.status === FileChangeType.ADDED) {
		return emptyFileUri;
	}

	const pull = await repository.getPullManager().getItem(pullNumber);
	const { owner, repo } = await router.getState();
	const originalAuthority = `${owner}+${repo}+${pull.base.sha}`;
	const originalPath = changedFile.previous_filename
		? `/${changedFile.previous_filename}`
		: uri.path;

	return uri.with({ authority: originalAuthority, path: originalPath });
};

// get the original source uri when the `routerState.pageType` is `PageType.COMMIT`
const getOriginalResourceForCommit = async (
	uri: vscode.Uri,
	commitSha: string
) => {
	const changedFiles = await repository
		.getCommitManager()
		.getCommitFiles(commitSha);
	const changedFile = changedFiles?.find(
		(changedFile) => changedFile.filename === uri.path.slice(1)
	);

	if (!changedFile || changedFile.status === FileChangeType.REMOVED) {
		return null;
	}

	if (changedFile.status === FileChangeType.ADDED) {
		return emptyFileUri;
	}

	const commit = await repository.getCommitManager().getItem(commitSha);
	const { owner, repo } = await router.getState();
	const parentCommitSha = commit.parents?.[0]?.sha;

	if (!parentCommitSha) {
		return emptyFileUri;
	}

	const originalAuthority = `${owner}+${repo}+${parentCommitSha}`;
	const originalPath = changedFile.previous_filename
		? `/${changedFile.previous_filename}`
		: uri.path;

	return uri.with({ authority: originalAuthority, path: originalPath });
};

export class GitHub1sQuickDiffProvider implements vscode.QuickDiffProvider {
	provideOriginalResource(
		uri: vscode.Uri,
		_token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Uri> {
		if (uri.scheme !== GitHub1sFileSystemProvider.scheme) {
			return null;
		}

		return router.getState().then(async (routerState) => {
			// only the file belong to current authority could be provided a quick diff
			if (uri.authority && uri.authority !== (await router.getAuthority())) {
				return null;
			}

			if (routerState.pageType === PageType.PULL) {
				return getOriginalResourceForPull(uri, routerState.pullNumber);
			}

			if (routerState.pageType === PageType.COMMIT) {
				return getOriginalResourceForCommit(uri, routerState.commitSha);
			}

			return null;
		});
	}
}
