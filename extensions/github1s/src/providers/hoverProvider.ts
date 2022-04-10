/**
 * @file HoverProvider
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getSourcegraphUrl } from '@/helpers/urls';
import { adapterManager } from '@/adapters';

const getSemanticMarkdownSuffix = (sourcegraphUrl: String) => `

---

[Semantic](https://docs.sourcegraph.com/code_intelligence/explanations/precise_code_intelligence) result provided by [Sourcegraph](${sourcegraphUrl})
`;

const getSearchBasedMarkdownSuffix = (sourcegraphUrl: String) => `

---

[Search-based](https://docs.sourcegraph.com/code_intelligence/explanations/precise_code_intelligence) result provided by [Sourcegraph](${sourcegraphUrl})
`;

export class GitHub1sHoverProvider implements vscode.HoverProvider {
	static scheme = 'github1s';

	async getSearchBasedHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		symbol: string
	): Promise<string | null> {
		const { line, character } = position;
		const authority = document.uri.authority || (await router.getAuthority());
		const [repo, ref] = authority.split('+').filter(Boolean);
		const dataSource = await adapterManager.getCurrentAdapter().resolveDataSource();

		const requestParams = [repo, ref, document.uri.path, line, character, symbol] as const;
		const definitions = await dataSource.provideSymbolDefinitions(...requestParams);

		if (!definitions.length) {
			return null;
		}

		// use the information of first definition as hover context
		const target = definitions[0];
		const isSameRepo = !target.scope || (target.scope.scheme === document.uri.scheme && target.scope.repo === repo);
		// if the definition target and the searched symbol is in the same
		// repository, just replace the `document.uri.path` with targetPath
		const targetFileUri = isSameRepo
			? document.uri.with({ path: `/${target.path}` })
			: vscode.Uri.parse('').with({
					scheme: target.scope?.scheme,
					authority: `${target.scope?.repo}+${target.scope?.ref}`,
					path: `/${target.path}`,
			  });
		// open corresponding file with target
		const textDocument = await vscode.workspace.openTextDocument(targetFileUri);
		// get the content in `[range.start.line - 2, range.end.line + 2]` lines
		const startPosition = new vscode.Position(Math.max(0, target.range.start.line - 2), 0);
		// eslint-disable-next-line max-len
		const endPosition = textDocument.lineAt(Math.min(textDocument.lineCount - 1, target.range.end.line + 2)).range.end;
		const codeText = textDocument.getText(new vscode.Range(startPosition, endPosition));

		return `\`\`\`${textDocument.languageId}\n${codeText}\n\`\`\``;
	}

	async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken
	): Promise<vscode.Hover | null> {
		const symbolRange = document.getWordRangeAtPosition(position);
		const symbol = symbolRange ? document.getText(symbolRange) : '';

		if (!symbol) {
			return null;
		}

		const authority = document.uri.authority || (await router.getAuthority());
		const [repo, ref] = authority.split('+').filter(Boolean);
		const path = document.uri.path;
		const { line, character } = position;

		// get the sourcegraph url for current symbol
		const sourcegraphUrl = getSourcegraphUrl(repo, ref, path, line, character);
		const requestParams = [repo, ref, path, line, character, symbol] as const;

		// get the hover result based on search
		const searchBasedMardownPromise = this.getSearchBasedHover(document, position, symbol);

		// get the hover result based on sourcegraph lsif
		const dataSource = await adapterManager.getCurrentAdapter().resolveDataSource();
		const symbolHover = await dataSource.provideSymbolHover(...requestParams);

		const markdown = symbolHover ? symbolHover.markdown : await searchBasedMardownPromise;

		if (!markdown) {
			return null;
		}

		const suffixMarkdown = symbolHover
			? getSemanticMarkdownSuffix(sourcegraphUrl)
			: getSearchBasedMarkdownSuffix(sourcegraphUrl);

		return new vscode.Hover(markdown + suffixMarkdown);
	}
}
