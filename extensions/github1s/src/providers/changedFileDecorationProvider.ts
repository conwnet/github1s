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
import repository, { FileChangeType } from '@/repository';
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

export class GitHub1sChangedFileDecorationProvider
	implements FileDecorationProvider, Disposable {
	private readonly disposable: Disposable;

	private _onDidChangeFileDecorations = new EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	dispose() {
		this.disposable?.dispose();
	}

	updateDecorations() {
		this._onDidChangeFileDecorations.fire(undefined);
	}

	provideFileDecoration(
		uri: Uri,
		_token: CancellationToken
	): ProviderResult<FileDecoration> {
		if (uri.scheme !== GitHub1sFileSystemProvider.scheme) {
			return null;
		}

		const currentFilePath = uri.path.slice(1);
		return router.getState().then(async (routerState) => {
			if (![PageType.PULL].includes(routerState.pageType)) {
				return null;
			}

			const changedFiles = await repository.getPullFiles(
				routerState.pullNumber
			);
			const changedFile = changedFiles?.find(
				(changedFile) => changedFile.filename === currentFilePath
			);
			if (changedFile) {
				return changedFileDecorationDataMap[changedFile.status];
			}
			const includeChangedFile = changedFiles?.find((changedFile) =>
				changedFile.filename.startsWith(`${currentFilePath}/`)
			);
			if (includeChangedFile) {
				return changedFileDecorationDataMap[FileChangeType.MODIFIED];
			}
			return null;
		});
	}
}
