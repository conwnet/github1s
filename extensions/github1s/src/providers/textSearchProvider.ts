/**
 * @file GitHub1s TextSearchProvider (ctrl/cmd + shift + f)
 * @author netcon
 */

import {
	CancellationToken,
	Disposable,
	Position,
	Progress,
	Range,
	TextSearchComplete,
	TextSearchOptions,
	TextSearchProvider,
	TextSearchQuery,
	TextSearchResult,
	Uri,
} from 'vscode';
import router from '@/router';
import { getTextSearchResults } from '@/interfaces/sourcegraph/search';
import { showSourcegraphSearchMessage } from '@/messages';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';

export class GitHub1sTextSearchProvider implements TextSearchProvider, Disposable {
	static scheme = 'github1s';
	private readonly disposable: Disposable;

	dispose() {
		this.disposable?.dispose();
	}

	provideTextSearchResults(
		query: TextSearchQuery,
		options: TextSearchOptions,
		progress: Progress<TextSearchResult>,
		_token: CancellationToken
	) {
		return router.getAuthority().then(async (authority) => {
			const [owner, repo, ref] = authority.split('+');
			const searchResults = await getTextSearchResults(owner, repo, ref, query, options);

			(searchResults.results || []).forEach((item) => {
				const fileUri = Uri.parse('').with({
					// because we set the authority of workspace as '' (on application start)
					// at src/vs/code/browser/workbench/workbench.ts
					// so don't specified authority here, or the VS Code won't use the results
					scheme: GitHub1sFileSystemProvider.scheme,
					path: `/${item.file?.path}`,
				});
				(item.lineMatches || []).forEach((match) => {
					progress.report({
						uri: fileUri,
						ranges: (match.offsetAndLengths || []).map(
							(range) =>
								new Range(new Position(match.lineNumber, range[0]), new Position(match.lineNumber, range[0] + range[1]))
						),
						preview: {
							text: match.preview,
							matches: (match.offsetAndLengths || []).map(
								(range) => new Range(new Position(0, range[0]), new Position(0, range[0] + range[1]))
							),
						},
					});
				});
			});

			showSourcegraphSearchMessage();
			return { limitHit: searchResults.limitHit } as TextSearchComplete;
		});
	}
}
