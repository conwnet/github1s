/**
 * @file github1s common utils
 * @autor netcon
 */

interface GitHubRouteState {
	owner: string;
	repo: string;
	type: string;
	branch: string;
	path: string;
	search: string;
	hash: string;
}

export const parseGitHubUrl = (url: string): GitHubRouteState => {
	const urlObj = new window.URL(url);
	const parts = urlObj.pathname.split(/\/|%2F/g).filter(Boolean);
	const hasFileType = ['tree', 'blob'].includes(parts[2]);
	const hasBranchName = hasFileType && parts[3];

	return {
		owner: parts[0] || 'conwnet',
		repo: parts[1] || 'github1s',
		type: (hasFileType ? parts[2] : 'tree').toLowerCase(),
		branch: hasBranchName ? parts[3] : 'HEAD',
		path: '/' + (hasBranchName ? parts.slice(4).join('/') : ''),
		search: urlObj.search || '',
		hash: urlObj.hash || ''
	};
};
