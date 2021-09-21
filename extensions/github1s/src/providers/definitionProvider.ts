/**
 * @file DefinitionProvider
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { showSourcegraphSymbolMessage } from '@/messages';
import platformAdapterManager from '@/adapters/manager';

export class GitHub1sDefinitionProvider implements vscode.DefinitionProvider, vscode.Disposable {
	private static instance: GitHub1sDefinitionProvider = null;
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
		_token: vscode.CancellationToken
	): Promise<vscode.Definition | vscode.LocationLink[]> {
		const symbolRange = document.getWordRangeAtPosition(position);
		const symbol = symbolRange ? document.getText(symbolRange) : '';

		if (!symbol) {
			return [];
		}

		const authority = document.uri.authority || (await router.getAuthority());
		const [repo, ref] = authority.split('+').filter(Boolean);
		const { scheme, path } = document.uri;
		const { line, character } = position;

		const dataSource = await platformAdapterManager.getCurrentAdapter().resolveDataSource();
		const symbolDefinitions = await dataSource.provideSymbolDefinitions(repo, ref, path, line, character, symbol);

		if (symbolDefinitions.length) {
			showSourcegraphSymbolMessage(repo, ref, path, line, character);
		}

		return symbolDefinitions.map(({ scope, path, range }) => {
			const isSameRepo = !scope || (scope.scheme === scheme && scope.repo === repo);
			// if the definition target and the searched symbol is in the same
			// repository, just replace the `document.uri.path` with targetPath
			// (so that the target file will open with expanding the file explorer)
			const uri = isSameRepo
				? document.uri.with({ path: `/${path}` })
				: vscode.Uri.parse('').with({
						scheme: scope.scheme,
						authority: `${scope.repo}+${scope.ref}`,
						path: `/${path}`,
				  });
			const { start, end } = range;
			return {
				uri,
				range: new vscode.Range(
					new vscode.Position(start.line, start.character),
					new vscode.Position(end.line, end.character)
				),
			};
		});
	}
}
