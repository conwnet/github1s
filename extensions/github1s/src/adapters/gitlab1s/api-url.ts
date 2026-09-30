/**
 * Resolve GitLab API URLs for the extension web worker (relative paths need a base origin).
 */

export const isSelfHostedGitLab = (): boolean => {
	try {
		return new URL(GITLAB_ORIGIN).hostname !== 'gitlab.com';
	} catch {
		return true;
	}
};

export const resolveGitLabApiUrl = (apiPath: string, pageUrl: string): string => {
	if (/^https?:\/\//i.test(apiPath)) {
		return apiPath;
	}
	return new URL(apiPath, new URL(pageUrl).origin).href;
};
