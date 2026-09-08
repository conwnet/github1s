export const MAX_TOOL_OUTPUT_CHARACTERS = 50_000;

/**
 * Format a prefix of whole lines within the output budget, including separators and a footer.
 * @param lines Formatted result lines.
 * @param getFooter Footer for the number of included lines, or an empty string when none is needed.
 * @returns The bounded output with its footer.
 */
export const formatToolOutput = (lines: readonly string[], getFooter: (includedLines: number) => string): string => {
	const output: string[] = [];
	let outputLength = 0;
	for (const line of lines) {
		const nextLength = outputLength + (output.length > 0 ? 1 : 0) + line.length;
		const footer = getFooter(output.length + 1);
		if (nextLength + (footer ? footer.length + 1 : 0) > MAX_TOOL_OUTPUT_CHARACTERS) break;
		output.push(line);
		outputLength = nextLength;
	}
	const footer = getFooter(output.length);
	return (footer ? [...output, footer] : output).join('\n');
};
