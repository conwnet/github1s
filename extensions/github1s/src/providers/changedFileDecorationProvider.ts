/**
 * @file GitHub1s ChangedFile FileDecorationProvider,
 * @author netcon
 * Decorate the file/directory that has changes
 */

import {
	CancellationToken,
	Disposable,
	EventEmitter,
	FileDecoration,
	FileDecorationProvider,
	ProviderResult,
	Uri,
	ThemeColor,
} from 'vscode';
import router from '@/router';
import { ChangedFile, FileChangeStatus, PageType } from '@/adapters/types';
import { adapterManager } from '@/adapters';
import { CodeReviewManager } from '@/views/code-review-manager';
import { CommitManager } from '@/views/commit-manager';

export const changedFileDecorationDataMap: { [key: string]: FileDecoration } = {
	[FileChangeStatus.Added]: {
		tooltip: 'Added',
		badge: 'A',
		color: new ThemeColor('gitDecoration.addedResourceForeground'),
	},
	[FileChangeStatus.Removed]: {
		tooltip: 'Deleted',
		badge: 'D',
		color: new ThemeColor('gitDecoration.deletedResourceForeground'),
	},
	[FileChangeStatus.Modified]: {
		tooltip: 'Modified',
		badge: 'M',
		color: new ThemeColor('gitDecoration.modifiedResourceForeground'),
	},
	[FileChangeStatus.Renamed]: {
		tooltip: 'Renamed',
		badge: 'R',
		color: new ThemeColor('gitDecoration.modifiedResourceForeground'),
	},
};

const getFileDecorationFromChangeFiles = (uri: Uri, changedFiles: ChangedFile[]): FileDecoration | null => {
	const changedFile = changedFiles.find((changedFile) => changedFile.path === uri.path.slice(1));

	if (changedFile) {
		return changedFileDecorationDataMap[changedFile.status];
	}
	// we have to determine the changed folder manually rather then use
	// the `propagate` property of FileDecoration, because the file tree
	// in the file explorer is lazy load
	const folderPath = `${uri.path.slice(1)}/`;
	const includeChangedFile = changedFiles.find((changedFile) => changedFile.path.startsWith(folderPath));
	if (includeChangedFile) {
		return {
			...changedFileDecorationDataMap[includeChangedFile.status],
			badge: '\u29bf',
		};
	}
	return null;
};

const getFileDecorationForCodeReview = async (uri: Uri, codeReviewId: string): Promise<FileDecoration | null> => {
	const [repo] = (uri.authority || (await router.getAuthority()))?.split('+') || [];
	const codeReviewManager = CodeReviewManager.getInstance(uri.scheme, repo)!;
	const changedFiles = await codeReviewManager.getChangedFiles(codeReviewId);
	return getFileDecorationFromChangeFiles(uri, changedFiles);
};

const getFileDecorationForCommit = async (uri: Uri, commitSha: string): Promise<FileDecoration | null> => {
	const [repo] = (uri.authority || (await router.getAuthority()))?.split('+') || [];
	const commitManager = CommitManager.getInstance(uri.scheme, repo)!;
	const changedFiles = await commitManager.getChangedFiles(commitSha);
	return getFileDecorationFromChangeFiles(uri, changedFiles);
};

export class GitHub1sChangedFileDecorationProvider implements FileDecorationProvider, Disposable {
	private readonly disposable: Disposable;

	private _onDidChangeFileDecorations = new EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	dispose() {
		this.disposable?.dispose();
	}

	updateDecorations() {
		this._onDidChangeFileDecorations.fire(undefined);
	}

	provideFileDecoration(uri: Uri, _token: CancellationToken): ProviderResult<FileDecoration> {
		const scheme = adapterManager.getCurrentScheme();
		if (uri.scheme !== scheme) {
			return null;
		}

		return router.getState().then((routerState) => {
			if (routerState.pageType === PageType.CodeReview) {
				return getFileDecorationForCodeReview(uri, routerState.codeReviewId);
			}
			if (routerState.pageType === PageType.Commit) {
				return getFileDecorationForCommit(uri, routerState.commitSha);
			}
			return null;
		});
	}
}
