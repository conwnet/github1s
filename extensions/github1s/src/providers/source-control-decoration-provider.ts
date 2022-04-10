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
import { changedFileDecorationDataMap } from './changed-file-decoration-provider';

const selectedViewItemDecoration: FileDecoration = {
	color: new ThemeColor('github1s.colors.selectedViewItem'),
	badge: '✔',
	tooltip: 'Selected',
};

export class GitHub1sSourceControlDecorationProvider implements FileDecorationProvider, Disposable {
	public static fileSchema: string = 'github1s-source-control-file';
	public static codeReviewSchema: string = 'github1s-source-control-code-review';
	public static commitSchema: string = 'github1s-source-control-commit';
	private static instance: GitHub1sSourceControlDecorationProvider | null = null;

	private readonly disposable: Disposable;
	private _onDidChangeFileDecorations = new EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	private constructor() {}

	public static getInstance(): GitHub1sSourceControlDecorationProvider {
		if (GitHub1sSourceControlDecorationProvider.instance) {
			return GitHub1sSourceControlDecorationProvider.instance;
		}
		return (GitHub1sSourceControlDecorationProvider.instance = new GitHub1sSourceControlDecorationProvider());
	}

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

		if (uri.scheme === GitHub1sSourceControlDecorationProvider.codeReviewSchema) {
			return router.getState().then((routerState) => {
				const query = queryString.parse(uri.query);
				return +(routerState as any).codeReviewId === +query.id! ? selectedViewItemDecoration : null;
			});
		}

		if (uri.scheme === GitHub1sSourceControlDecorationProvider.commitSchema) {
			return router.getState().then((routerState) => {
				const query = queryString.parse(uri.query);
				return (routerState as any).commitSha === query.sha ? selectedViewItemDecoration : null;
			});
		}
	}
}
