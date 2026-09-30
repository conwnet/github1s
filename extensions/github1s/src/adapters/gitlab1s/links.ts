/**
 * @file GitLab UI links for this fork
 */

export const resolveProjectAccessTokenLink = (repo: string): string => {
	const normalized = repo?.trim();
	if (!normalized) {
		return `${GITLAB_ORIGIN}/-/profile/personal_access_tokens?scopes=read_api&name=GitLab1s`;
	}
	return `${GITLAB_ORIGIN}/${normalized}/-/settings/access_tokens`;
};
