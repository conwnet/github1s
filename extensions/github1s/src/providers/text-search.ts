/**
 * @file GitHub1s TextSearchProvider (ctrl/cmd + shift + f)
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import adapterManager from '@/adapters/manager';
import { showSourcegraphSearchMessage } from '@/messages';
import * as adapterTypes from '@/adapters/types';

const ensureArray = <T>(arrayOrItem: T | T[]): T[] => (Array.isArray(arrayOrItem) ? arrayOrItem : [arrayOrItem]);
const createVscodeRange = (range: adapterTypes.Range) =>
	new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);

export class GitHub1sTextSearchProvider implements vscode.TextSearchProvider, vscode.Disposable {
	private static instance: GitHub1sTextSearchProvider | null = null;
	private readonly disposable: vscode.Disposable;

	private constructor() {}

	public static getInstance(): GitHub1sTextSearchProvider {
		if (GitHub1sTextSearchProvider.instance) {
			return GitHub1sTextSearchProvider.instance;
		}
		return (GitHub1sTextSearchProvider.instance = new GitHub1sTextSearchProvider());
	}

	dispose() {
		this.disposable?.dispose();
	}

	provideTextSearchResults(
		query: vscode.TextSearchQuery,
		options: vscode.TextSearchOptions,
		progress: vscode.Progress<vscode.TextSearchResult>,
		_token: vscode.CancellationToken,
	) {
		return router.getAuthority().then(async (authority) => {
			const [repo, ref] = authority.split('+');
			const dataSource = await adapterManager.getCurrentAdapter().resolveDataSource();
			const searchOptions = { page: 1, pageSize: 100, includes: options.includes, excludes: options.excludes };
			const searchResults = await dataSource.provideTextSearchResults(repo, ref, query, searchOptions);
			const currentScheme = adapterManager.getCurrentScheme();

			(searchResults.results || []).forEach((item) => {
				// because we set the authority of workspace as '' (on application start)
				// at src/vs/code/browser/workbench/workbench.ts
				// so don't specified authority here, or the VS Code won't use the results
				const fileUri = vscode.Uri.parse('').with({ scheme: currentScheme, path: `/${item.path}` });
				const ranges = ensureArray(item.ranges).map((range) => createVscodeRange(range));
				const previewMatches = ensureArray(item.preview.matches).map((match) => createVscodeRange(match));
				const preview = { text: item.preview.text, matches: previewMatches };

				progress.report({ uri: fileUri, ranges, preview });
			});

			showSourcegraphSearchMessage();
			return { limitHit: searchResults.truncated };
		});
	}
}
