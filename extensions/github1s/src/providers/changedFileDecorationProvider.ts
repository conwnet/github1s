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
import repository from '@/repository';
import { FileChangeType, RepositoryChangedFile } from '@/repository/types';
import { PageType } from '@/router/types';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';

export const changedFileDecorationDataMap: { [key: string]: FileDecoration } = {
	[FileChangeType.ADDED]: {
		tooltip: 'Added',
		badge: 'A',
		color: new ThemeColor('gitDecoration.addedResourceForeground'),
	},
	[FileChangeType.REMOVED]: {
		tooltip: 'Deleted',
		badge: 'D',
		color: new ThemeColor('gitDecoration.deletedResourceForeground'),
	},
	[FileChangeType.MODIFIED]: {
		tooltip: 'Modified',
		badge: 'M',
		color: new ThemeColor('gitDecoration.modifiedResourceForeground'),
	},
	[FileChangeType.RENAMED]: {
		tooltip: 'Renamed',
		badge: 'R',
		color: new ThemeColor('gitDecoration.modifiedResourceForeground'),
	},
};

const getFileDecorationFromChangeFiles = (uri: Uri, changedFiles: RepositoryChangedFile[]): FileDecoration => {
	const changedFile = changedFiles?.find((changedFile) => changedFile.filename === uri.path.slice(1));

	if (changedFile) {
		return changedFileDecorationDataMap[changedFile.status];
	}
	// we have to determine the changed folder manually rather then use
	// the `propagate` property of FileDecoration, because the file tree
	// in the file explorer is lazy load
	const includeChangedFile = changedFiles?.find((changedFile) =>
		changedFile.filename.startsWith(`${uri.path.slice(1)}/`)
	);
	if (includeChangedFile) {
		return {
			...changedFileDecorationDataMap[includeChangedFile.status],
			badge: '\u29bf',
		};
	}
	return null;
};

const getFileDecorationForPull = async (uri: Uri, pullNumber: number): Promise<FileDecoration> => {
	const changedFiles = await repository.getPullManager().getPullFiles(pullNumber);
	return getFileDecorationFromChangeFiles(uri, changedFiles);
};

const getFileDecorationForCommit = async (uri: Uri, commitSha: string): Promise<FileDecoration> => {
	const changedFiles = await repository.getCommitManager().getCommitFiles(commitSha);
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
		if (uri.scheme !== GitHub1sFileSystemProvider.scheme) {
			return null;
		}

		return router.getState().then((routerState) => {
			if (routerState.pageType === PageType.PULL) {
				return getFileDecorationForPull(uri, routerState.pullNumber);
			}
			if (routerState.pageType === PageType.COMMIT) {
				return getFileDecorationForCommit(uri, routerState.commitSha);
			}
			return null;
		});
	}
}
