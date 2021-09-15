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
	EventEmitter,
} from 'vscode';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';
import { Directory } from './fileSystemProvider/types';

export class GitHub1sSubmoduleDecorationProvider implements FileDecorationProvider, Disposable {
	private readonly disposable: Disposable;

	// the directory which is submodule will be decorated with this
	private static submoduleDecorationData: FileDecoration = {
		tooltip: 'Submodule',
		badge: 'S',
		color: new ThemeColor('gitDecoration.submoduleResourceForeground'),
	};

	private _onDidChangeFileDecorations = new EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	constructor(private fsProvider: GitHub1sFileSystemProvider) {}

	dispose() {
		this.disposable?.dispose();
	}

	updateDecorations() {
		this._onDidChangeFileDecorations.fire(undefined);
	}

	provideFileDecoration(uri: Uri, _token: CancellationToken): ProviderResult<FileDecoration> {
		return this.fsProvider.lookup(uri, false).then((entry) => {
			if (entry instanceof Directory && entry.isSubmodule === true) {
				return GitHub1sSubmoduleDecorationProvider.submoduleDecorationData;
			}
			return null;
		});
	}
}
