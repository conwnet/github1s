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
	ThemeColor,
	Uri,
} from 'vscode';
import router from '@/router';
import * as queryString from 'query-string';
import { changedFileDecorationDataMap } from './changedFileDecorationProvider';

const selectedViewItemDecoration: FileDecoration = {
	color: new ThemeColor('github1s.colors.selectedViewItem'),
	badge: '✔',
	tooltip: 'Selected',
};

export class GitHub1sSourceControlDecorationProvider implements FileDecorationProvider, Disposable {
	public static fileSchema: string = 'github1s-source-control-file';
	public static pullSchema: string = 'github1s-source-control-pull';
	public static commitSchema: string = 'github1s-source-control-commit';

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
		if (uri.scheme === GitHub1sSourceControlDecorationProvider.fileSchema) {
			const query = queryString.parse(uri.query);
			return changedFileDecorationDataMap[query.status as string];
		}

		if (uri.scheme === GitHub1sSourceControlDecorationProvider.pullSchema) {
			return router.getState().then((routerState) => {
				const query = queryString.parse(uri.query);
				return +routerState.pullNumber === +query.number ? selectedViewItemDecoration : null;
			});
		}

		if (uri.scheme === GitHub1sSourceControlDecorationProvider.commitSchema) {
			return router.getState().then((routerState) => {
				const query = queryString.parse(uri.query);
				return routerState.commitSha === query.sha ? selectedViewItemDecoration : null;
			});
		}
	}
}
