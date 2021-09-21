/**
 * @file extension url helpers
 * @author netcon
 */

export const getSourcegraphUrl = (repo: string, ref: string, path: string, line: number, character: number): string => {
	const repoUrl = `https://sourcegraph.com/github.com/${repo}@${ref}`;
	return `${repoUrl}/-/blob${path}#L${line + 1}:${character + 1}`;
};
