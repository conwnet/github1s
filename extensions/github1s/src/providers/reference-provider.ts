/**
 * @file ReferenceProvider
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { showSourcegraphSymbolMessage } from '@/messages';
import adapterManager from '@/adapters/manager';

export class GitHub1sReferenceProvider implements vscode.ReferenceProvider, vscode.Disposable {
	private static instance: GitHub1sReferenceProvider | null = null;
	private readonly disposable: vscode.Disposable;

	private constructor() {}

	public static getInstance(): GitHub1sReferenceProvider {
		if (GitHub1sReferenceProvider.instance) {
			return GitHub1sReferenceProvider.instance;
		}
		return (GitHub1sReferenceProvider.instance = new GitHub1sReferenceProvider());
	}

	dispose() {
		this.disposable?.dispose();
	}

	async provideReferences(
		document: vscode.TextDocument,
		position: vscode.Position,
		_context: vscode.ReferenceContext,
		_token: vscode.CancellationToken
	): Promise<vscode.Location[]> {
		const symbolRange = document.getWordRangeAtPosition(position);
		const symbol = symbolRange ? document.getText(symbolRange) : '';

		if (!symbol) {
			return [];
		}

		const authority = document.uri.authority || (await router.getAuthority());
		const [repo, ref] = authority.split('+').filter(Boolean);
		const { scheme, path } = document.uri;
		const { line, character } = position;

		const dataSource = await adapterManager.getCurrentAdapter().resolveDataSource();
		const symbolReferences = await dataSource.provideSymbolReferences(repo, ref, path, line, character, symbol);

		if (symbolReferences.length) {
			showSourcegraphSymbolMessage(repo, ref, path, line, character);
		}

		return symbolReferences.map(({ scope, path, range }) => {
			const isSameRepo = !scope || (scope.scheme === scheme && scope.repo === repo);
			// if the reference target and the searched symbol is in the same
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
