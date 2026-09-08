import { isPlainObject, isSafeInteger } from 'lodash-es';

export interface SyntaxHighlightingData {
	tokens: Array<{ length: number; foreground: number; fontStyle: number }>;
	colorMap: string[];
}

export const isSyntaxHighlightingData = (value: unknown, sourceLength: number): value is SyntaxHighlightingData => {
	if (!isPlainObject(value)) return false;
	const data = value as Record<string, unknown>;
	if (!Array.isArray(data.tokens) || !Array.isArray(data.colorMap)) return false;
	if (!data.colorMap.every((color) => typeof color === 'string')) return false;
	let highlightedLength = 0;
	for (const valueToken of data.tokens) {
		if (!isPlainObject(valueToken)) return false;
		const token = valueToken as Record<string, unknown>;
		const { foreground, fontStyle, length } = token;
		if (
			typeof length !== 'number' ||
			!isSafeInteger(length) ||
			length <= 0 ||
			typeof foreground !== 'number' ||
			!isSafeInteger(foreground) ||
			foreground < 0 ||
			foreground >= data.colorMap.length ||
			typeof fontStyle !== 'number' ||
			!isSafeInteger(fontStyle) ||
			fontStyle < 0 ||
			(fontStyle & ~15) !== 0
		) {
			return false;
		}
		highlightedLength += length;
	}
	return highlightedLength === sourceLength;
};
