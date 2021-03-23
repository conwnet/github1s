/**
 * @file GitHub1s File Decoration for the view in SourceControl Panel
 * @author netcon
 */

import {
	CancellationToken,
	Disposable,
	EventEmitter,
	FileDecoration,
	FileDecorationProvider,
	ProviderResult,
	Uri,
} from 'vscode';
import { parseQuery } from '@/helpers/util';
import router from '@/router';
import { changedFileDecorationDataMap } from './changedFileDecorationProvider';

export class GitHub1sSourceControlDecorationProvider
	implements FileDecorationProvider, Disposable {
	public static fileSchema: string = 'github1s-source-control-file';
	public static pullSchema: string = 'github1s-source-control-pull';

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
		if (uri.scheme === GitHub1sSourceControlDecorationProvider.fileSchema) {
			const query = parseQuery(uri.query);
			return changedFileDecorationDataMap[query.status];
		}

		if (uri.scheme === GitHub1sSourceControlDecorationProvider.pullSchema) {
			return router.getState().then((routerState) => {
				const query = parseQuery(uri.query);
				return {
					badge: +routerState.pullNumber === +query.number ? '✔' : '',
				};
			});
		}
	}
}
