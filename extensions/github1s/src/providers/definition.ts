/**
 * @file DefinitionProvider
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getAdapter } from '@/adapters';
import { showSourcegraphSymbolMessage } from '@/messages';

export const mapScopeScheme = (scopeScheme: string) => {
	if (scopeScheme === 'github') {
		return 'github1s';
	} else if (scopeScheme === 'gitlab') {
		return 'gitlab1s';
	} else if (scopeScheme === 'bitbucket') {
		return 'bitbucket1s';
	} else {
		return scopeScheme;
	}
};

export class GitHub1sDefinitionProvider implements vscode.DefinitionProvider, vscode.Disposable {
	private static instance: GitHub1sDefinitionProvider | null = null;
	private readonly disposable: vscode.Disposable;

	private constructor() {}

	public static getInstance(): GitHub1sDefinitionProvider {
		if (GitHub1sDefinitionProvider.instance) {
			return GitHub1sDefinitionProvider.instance;
		}
		return (GitHub1sDefinitionProvider.instance = new GitHub1sDefinitionProvider());
	}

	dispose() {
		this.disposable?.dispose();
	}

	async provideDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken,
	): Promise<vscode.Definition | vscode.LocationLink[]> {
		const symbolRange = document.getWordRangeAtPosition(position);
		const symbol = symbolRange ? document.getText(symbolRange) : '';

		if (!symbol) {
			return [];
		}

		const { scheme, repo, ref, path } = router.parseUri(document.uri);
		const { line, character } = position;

		const dataSource = await getAdapter(scheme).resolveDataSource();
		const symbolDefinitions = await dataSource.provideSymbolDefinitions(repo, ref, path, line, character, symbol);

		if (symbolDefinitions.length) {
			showSourcegraphSymbolMessage(repo, ref, path, line, character);
		}

		return symbolDefinitions.map(({ scope, path, range }) => {
			const toScheme = mapScopeScheme(scope?.scheme || '');
			const isSameRepo = !scope || (toScheme === scheme && scope.repo === repo);
			// if the definition target and the searched symbol is in the same
			// repository, just replace the `document.uri.path` with targetPath
			// (so that the target file will open with expanding the file explorer)
			const uri = isSameRepo
				? document.uri.with({ path })
				: router.buildUri({ scheme: toScheme, repo: scope?.repo, ref: scope?.ref, path });
			const { start, end } = range;
			return {
				uri,
				range: new vscode.Range(
					new vscode.Position(start.line, start.character),
					new vscode.Position(end.line, end.character),
				),
			};
		});
	}
}
