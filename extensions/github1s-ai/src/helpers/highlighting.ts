import * as vscode from 'vscode';

import { isSyntaxHighlightingData, type SyntaxHighlightingData } from '@/common/highlighting';

type ProposedLanguages = typeof vscode.languages & {
	computeFullSyntaxHighlighting?: typeof vscode.languages.computeFullSyntaxHighlighting;
	onDidChangeSyntaxHighlighting?: typeof vscode.languages.onDidChangeSyntaxHighlighting;
};

const languages = vscode.languages as ProposedLanguages;

export const computeSyntaxHighlighting = async (
	source: string,
	languageId: string,
): Promise<SyntaxHighlightingData | undefined> => {
	if (!languages.computeFullSyntaxHighlighting) return undefined;
	try {
		const result = await languages.computeFullSyntaxHighlighting(source, languageId);
		if (!isSyntaxHighlightingData(result, source.length)) return undefined;
		return {
			tokens: result.tokens.map(({ length, foreground, fontStyle }) => ({ length, foreground, fontStyle })),
			colorMap: [...result.colorMap],
		};
	} catch {
		return undefined;
	}
};

export const onDidChangeSyntaxHighlighting = (listener: () => void): vscode.Disposable | undefined =>
	languages.onDidChangeSyntaxHighlighting?.(listener);
