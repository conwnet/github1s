/**
 * @file github1s common utils
 * @autor netcon
 */

interface GitHubRouteState {
	owner: string;
	repo: string;
	type: string;
	branch?: string;
	path: string;
	search: string;
	hash: string;
}

export const parseGitHubUrl = (url: string): GitHubRouteState => {
	const urlObj = new window.URL(url);
	const parts = urlObj.pathname.split(/\/|%2F/g).filter(Boolean);
	const hasFileType = ['tree', 'blob'].includes(parts[2]);

	return {
		owner: parts[0] || 'conwnet',
		repo: parts[1] || 'github1s',
		type: (hasFileType ? parts[2] : 'tree').toLowerCase(),
		path: '/' + parts.slice(2).join('/'),
		search: urlObj.search || '',
		hash: urlObj.hash || ''
	};
};

export const splitPathByBranchName = (pathname: string, branchNames: string[]) => {
	const branchNameSet = new Set([...branchNames, 'HEAD']);
	const parts = pathname.split('/').filter(Boolean).slice(3);
	if (parts.length < 1) {
		return ['HEAD', '/'];
	}
	let branch;
	for (const part of parts) {
		branch = branch ? `${branch}/${part}` : part;
		if (branchNameSet.has(branch)) {
			return [
				branch,
				parts.join('/').substring(branch.length)
			];
		}
	}
	// commit id based URL
	return [parts[0], '/' + parts.slice(1).join('')];
};

export const parseGitHubUrlWithBranchNames = (url: string, branchNames: string[]): GitHubRouteState => {
	const urlObj = new window.URL(url);
	const parts = urlObj.pathname.split(/\/|%2F/g).filter(Boolean);
	const hasBranchName = ['tree', 'blob'].includes(parts[2]);

	const [branch, path] = splitPathByBranchName(urlObj.pathname, branchNames);

	return {
		owner: parts[0] || 'conwnet',
		repo: parts[1] || 'github1s',
		type: (hasBranchName ? parts[2] : 'tree').toLowerCase(),
		branch,
		path,
		search: urlObj.search || '',
		hash: urlObj.hash || ''
	};
};
