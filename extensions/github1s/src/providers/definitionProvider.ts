/**
 * @file DefinitionProvider
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getSymbolDefinitions } from '@/interfaces/sourcegraph/definition';
import { showSourcegraphSymbolMessage } from '@/messages';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';

export class GitHub1sDefinitionProvider implements vscode.DefinitionProvider {
	static scheme = 'github1s';

	async provideDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken
	): Promise<vscode.Definition | vscode.LocationLink[]> {
		const symbolRange = document.getWordRangeAtPosition(position);
		const symbol = symbolRange ? document.getText(symbolRange) : '';

		if (!symbol) {
			return;
		}

		const authority = document.uri.authority || (await router.getAuthority());
		const [owner, repo, ref] = authority.split('+').filter(Boolean);
		const path = document.uri.path;
		const { line, character } = position;

		const symbolDefinitions = await getSymbolDefinitions(owner, repo, ref, path, line, character, symbol);

		if (symbolDefinitions.length) {
			showSourcegraphSymbolMessage(owner, repo, ref, path, line, character);
		}

		return symbolDefinitions.map((repoDefinition) => {
			const isSameRepo = repoDefinition.owner === owner && repoDefinition.repo === repo;
			// if the definition target and the searched symbol is in the same
			// repository, just replace the `document.uri.path` with targetPath
			// (so that the target file will open with expanding the file explorer)
			const uri = isSameRepo
				? document.uri.with({ path: repoDefinition.path })
				: vscode.Uri.parse('').with({
						scheme: GitHub1sFileSystemProvider.scheme,
						authority: `${owner}+${repo}+${ref}`,
						path: repoDefinition.path,
				  });
			const { start, end } = repoDefinition.range;
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
