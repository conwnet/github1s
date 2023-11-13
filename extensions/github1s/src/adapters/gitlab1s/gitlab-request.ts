/**
 * @file github api auth token manager
 */
import { getExtensionContext } from '@/helpers/context';
import { reuseable } from '@/helpers/func';
import { GitLabTokenManager } from './token';

const GITLAB_OAUTH_TOKEN = 'gitlab-oauth-token';

let token: string;
function getToken(): string {
	token = getExtensionContext().globalState.get(GITLAB_OAUTH_TOKEN) || '';
	return token;
}

export class GitlabRequest {
	accessToken: string;

	constructor({ accessToken }) {
		this.accessToken = accessToken;
	}

	public request = reuseable((command: string, params: Record<string, string | number | boolean | undefined>) => {
		let [method, url] = command.split(' ');
		Object.keys(params).forEach((el) => {
			url = url.replace(`{${el}}`, `${params[el]}`);
		});
		const fetchOptions = GitLabTokenManager.getInstance().getHeader(this.accessToken);
		return fetch(`${GITLAB_DOMAIN}/api/v4` + url, {
			...fetchOptions,
			method,
		}).then(async (response) => {
			const data = await response.json();
			if (response.status >= 400) {
				return Promise.reject({
					status: response.status,
					data,
				});
			}

			if (response.status === 200 || response.status === 304) {
				return { data, headers: response.headers };
			}
			return Promise.reject({ data, headers: response.headers });
		});
	});
}
