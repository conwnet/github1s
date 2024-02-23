/**
 * @file gitlab api auth token manager
 */

import { GitHubTokenManager, ValidateResult } from '../github1s/token';

export class GitLabTokenManager extends GitHubTokenManager {
	protected static instance: GitLabTokenManager | null = null;
	public tokenStateKey = 'gitlab-oauth-token';

	public static getInstance(): GitLabTokenManager {
		if (GitLabTokenManager.instance) {
			return GitLabTokenManager.instance;
		}
		return (GitLabTokenManager.instance = new GitLabTokenManager());
	}

	public async validateToken(token?: string): Promise<ValidateResult | null> {
		const accessToken = token === undefined ? this.getToken() : token;
		if (!accessToken) {
			return Promise.resolve(null);
		}
		const fetchOptions: { headers: Record<string, string> } =
			accessToken?.length < 60
				? { headers: { 'PRIVATE-TOKEN': `${accessToken}` } }
				: { headers: { Authorization: `Bearer ${accessToken}` } };
		return fetch(`${GITLAB_API_PREFIX}/user`, fetchOptions)
			.then((response) => {
				if (response.status === 401) {
					return null;
				}
				return response.json().then((data) => ({
					username: data.username,
					avatar_url: data.avatar_url,
					profile_url: data.web_url,
				}));
			})
			.catch(() => null);
	}
}
