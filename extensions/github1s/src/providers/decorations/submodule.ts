/**
 * @file GitHub1s Submodule FileDecorationProvider,
 * @author netcon
 * Decorate the directory which is a submodule in the file tree
 */

import {
	CancellationToken,
	Disposable,
	EventEmitter,
	FileDecoration,
	FileDecorationProvider,
	ProviderResult,
	ThemeColor,
	Uri,
} from 'vscode';
import { GitHub1sFileSystemProvider } from '../file-system';
import { Directory } from '../file-system/types';

export class GitHub1sSubmoduleDecorationProvider implements FileDecorationProvider, Disposable {
	private static instance: GitHub1sSubmoduleDecorationProvider | null = null;
	private readonly disposable: Disposable;

	private constructor() {}

	public static getInstance(): GitHub1sSubmoduleDecorationProvider {
		if (GitHub1sSubmoduleDecorationProvider.instance) {
			return GitHub1sSubmoduleDecorationProvider.instance;
		}
		return (GitHub1sSubmoduleDecorationProvider.instance = new GitHub1sSubmoduleDecorationProvider());
	}

	dispose() {
		this.disposable?.dispose();
	}

	// the directory which is submodule will be decorated with this
	private static submoduleDecorationData: FileDecoration = {
		tooltip: 'Submodule',
		badge: 'S',
		color: new ThemeColor('github1s.colors.submoduleResourceForeground'),
	};

	private _onDidChangeFileDecorations = new EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	updateDecorations() {
		this._onDidChangeFileDecorations.fire(undefined);
	}

	provideFileDecoration(uri: Uri, _token: CancellationToken): ProviderResult<FileDecoration> {
		return GitHub1sFileSystemProvider.getInstance()
			.lookup(uri, false)
			.then((entry) => {
				if (entry instanceof Directory && entry.isSubmodule === true) {
					return GitHub1sSubmoduleDecorationProvider.submoduleDecorationData;
				}
				return null;
			});
	}
}
