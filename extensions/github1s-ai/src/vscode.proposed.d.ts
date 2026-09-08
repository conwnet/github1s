/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {
	export namespace languages {
		export function computeFullSyntaxHighlighting(
			source: string,
			languageId: string,
		): Thenable<SyntaxHighlightingResult>;

		export const onDidChangeSyntaxHighlighting: Event<void>;
	}

	export interface SyntaxHighlightingResult {
		readonly tokens: readonly SyntaxHighlightingToken[];
		readonly colorMap: readonly string[];
	}

	export interface SyntaxHighlightingToken {
		readonly length: number;
		readonly foreground: number;
		readonly fontStyle: SyntaxHighlightingTokenFontStyle;
	}

	export enum SyntaxHighlightingTokenFontStyle {
		None = 0,
		Italic = 1,
		Bold = 2,
		Underline = 4,
		Strikethrough = 8,
	}
}
