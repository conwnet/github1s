/**
 * @file ReferenceProvider
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getSymbolReferences } from '@/interfaces/sourcegraph/reference';
import { showSourcegraphSymbolMessage } from '@/messages';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';

export class GitHub1sReferenceProvider implements vscode.ReferenceProvider {
	static scheme = 'github1s';

	async provideReferences(
		document: vscode.TextDocument,
		position: vscode.Position,
		_context: vscode.ReferenceContext,
		_token: vscode.CancellationToken
	): Promise<vscode.Location[]> {
		const symbolRange = document.getWordRangeAtPosition(position);
		const symbol = symbolRange ? document.getText(symbolRange) : '';

		if (!symbol) {
			return;
		}

		const authority = document.uri.authority || (await router.getAuthority());
		const [owner, repo, ref] = authority.split('+').filter(Boolean);
		const path = document.uri.path;
		const { line, character } = position;

		const symbolReferences = await getSymbolReferences(owner, repo, ref, path, line, character, symbol);

		if (symbolReferences.length) {
			showSourcegraphSymbolMessage(owner, repo, ref, path, line, character);
		}

		return symbolReferences.map((repoReference) => {
			const isSameRepo = repoReference.owner === owner && repoReference.repo === repo;
			// if the reference target and the searched symbol is in the same
			// repository, just replace the `document.uri.path` with targetPath
			// (so that the target file will open with expanding the file explorer)
			const uri = isSameRepo
				? document.uri.with({ path: repoReference.path })
				: vscode.Uri.parse('').with({
						scheme: GitHub1sFileSystemProvider.scheme,
						authority: `${owner}+${repo}+${ref}`,
						path: repoReference.path,
				  });
			const { start, end } = repoReference.range;
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
