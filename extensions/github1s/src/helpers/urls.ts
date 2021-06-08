/**
 * @file extension url helpers
 * @author netcon
 */

export const getSourcegraphUrl = (
	owner: string,
	repo: string,
	ref: string,
	path: string,
	line: number,
	character: number
): string => {
	const repoUrl = `https://sourcegraph.com/github.com/${owner}/${repo}@${ref}`;
	return `${repoUrl}/-/blob${path}#L${line + 1}:${character + 1}`;
};
