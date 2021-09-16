/**
 * @file HoverProvider
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getSymbolHover, SymbolHover } from '@/interfaces/sourcegraph/hover';
import { getSymbolPositions } from '@/interfaces/sourcegraph/position';
import { getSourcegraphUrl } from '@/helpers/urls';

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

	async getSearchBasedHover(document: vscode.TextDocument, symbol: string): Promise<SymbolHover | null> {
		const authority = document.uri.authority || (await router.getAuthority());
		const [owner, repo, ref] = authority.split('+').filter(Boolean);
		const definitions = await getSymbolPositions(owner, repo, ref, symbol);

		if (!definitions.length) {
			return null;
		}

		// use the information of first definition as hover context
		const target = definitions[0];
		const isSameRepo = target.owner === owner && target.repo === repo;
		// if the definition target and the searched symbol is in the same
		// repository, just replace the `document.uri.path` with targetPath
		const targetFileUri = isSameRepo
			? document.uri.with({ path: target.path })
			: vscode.Uri.parse('').with({
					scheme: GitHub1sHoverProvider.scheme,
					authority: `${target.owner}+${target.repo}+${target.ref}`,
					path: target.path,
			  });
		// open corresponding file with target
		const textDocument = await vscode.workspace.openTextDocument(targetFileUri);
		// get the content in `[range.start.line - 2, range.end.line + 2]` lines
		const startPosition = new vscode.Position(Math.max(0, target.range.start.line - 2), 0);
		// eslint-disable-next-line max-len
		const endPosition = textDocument.lineAt(Math.min(textDocument.lineCount - 1, target.range.end.line + 2)).range.end;
		const codeText = textDocument.getText(new vscode.Range(startPosition, endPosition));

		return {
			precise: false,
			markdown: `\`\`\`${textDocument.languageId}\n${codeText}\n\`\`\``,
		};
	}

	async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken
	): Promise<vscode.Hover | null> {
		const symbolRange = document.getWordRangeAtPosition(position);
		const symbol = symbolRange ? document.getText(symbolRange) : '';

		if (!symbol) {
			return;
		}

		const authority = document.uri.authority || (await router.getAuthority());
		const [owner, repo, ref] = authority.split('+').filter(Boolean);
		const path = document.uri.path;
		const { line, character } = position;

		type ParamsType = [string, string, string, string, number, number];
		const requestParams: ParamsType = [owner, repo, ref, path, line, character];
		// get the sourcegraph url for current symbol
		const sourcegraphUrl = getSourcegraphUrl(...requestParams);
		// get the hover result based on sourcegraph lsif
		const preciseHoverPromise = getSymbolHover(...requestParams);
		// get the hover result based on search
		const searchBasedHoverPromise = this.getSearchBasedHover(document, symbol);

		const symbolHover = await preciseHoverPromise.then((symbolHover) => {
			if (symbolHover) {
				return symbolHover;
			}
			// fallback to search based result if we can not get precise result
			return searchBasedHoverPromise;
		});

		if (!symbolHover) {
			return null;
		}

		const suffixMarkdown = symbolHover.precise
			? getSemanticMarkdownSuffix(sourcegraphUrl)
			: getSearchBasedMarkdownSuffix(sourcegraphUrl);

		return new vscode.Hover(symbolHover.markdown + suffixMarkdown);
	}
}
