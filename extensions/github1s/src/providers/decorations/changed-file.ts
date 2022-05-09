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
import { Repository } from '@/repository';

export const changedFileDecorationDataMap: { [key: string]: FileDecoration } = {
	[FileChangeStatus.Added]: {
		tooltip: 'Added',
		badge: 'A',
		color: new ThemeColor('github1s.colors.addedResourceForeground'),
	},
	[FileChangeStatus.Removed]: {
		tooltip: 'Deleted',
		badge: 'D',
		color: new ThemeColor('github1s.colors.deletedResourceForeground'),
	},
	[FileChangeStatus.Modified]: {
		tooltip: 'Modified',
		badge: 'M',
		color: new ThemeColor('github1s.colors.modifiedResourceForeground'),
	},
	[FileChangeStatus.Renamed]: {
		tooltip: 'Renamed',
		badge: 'R',
		color: new ThemeColor('github1s.colors.modifiedResourceForeground'),
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
	const repository = Repository.getInstance(uri.scheme, repo);
	const changedFiles = await repository.getCodeReviewChangedFiles(codeReviewId);
	return getFileDecorationFromChangeFiles(uri, changedFiles);
};

const getFileDecorationForCommit = async (uri: Uri, commitSha: string): Promise<FileDecoration | null> => {
	const [repo] = (uri.authority || (await router.getAuthority()))?.split('+') || [];
	const repository = Repository.getInstance(uri.scheme, repo);
	const changedFiles = await repository.getCommitChangedFiles(commitSha);
	return getFileDecorationFromChangeFiles(uri, changedFiles);
};

export class GitHub1sChangedFileDecorationProvider implements FileDecorationProvider, Disposable {
	private static instance: GitHub1sChangedFileDecorationProvider | null = null;
	private readonly disposable: Disposable;

	private _onDidChangeFileDecorations = new EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	private constructor() {}

	public static getInstance(): GitHub1sChangedFileDecorationProvider {
		if (GitHub1sChangedFileDecorationProvider.instance) {
			return GitHub1sChangedFileDecorationProvider.instance;
		}
		return (GitHub1sChangedFileDecorationProvider.instance = new GitHub1sChangedFileDecorationProvider());
	}

	dispose() {
		this.disposable?.dispose();
	}

	updateDecorations() {
		this._onDidChangeFileDecorations.fire(undefined);
	}

	provideFileDecoration(uri: Uri, _token: CancellationToken): ProviderResult<FileDecoration> {
		if (uri.scheme !== adapterManager.getCurrentScheme()) {
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
