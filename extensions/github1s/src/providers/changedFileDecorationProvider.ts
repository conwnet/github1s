/**
 * @file GitHub1s Submodule FileDecorationProvider,
 * @author netcon
 * Decorate the directory which is a submodule in the file tree
 */

import {
	CancellationToken,
	Disposable,
	Event,
	FileDecoration,
	FileDecorationProvider,
	ProviderResult,
	Uri,
	ThemeColor,
} from 'vscode';
import router from '@/router';
import repository, { FileChangeType } from '@/repository';
import { PageType } from '@/router/types';

const changedFileDecorationDataMap: { [key: string]: FileDecoration } = {
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

	onDidChangeFileDecorations?: Event<Uri | Uri[]>;

	dispose() {
		this.disposable?.dispose();
	}

	provideFileDecoration(
		uri: Uri,
		_token: CancellationToken
	): ProviderResult<FileDecoration> {
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
