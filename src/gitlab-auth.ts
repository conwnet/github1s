/**
 * @file connect to gitlab
 * @author netcon
 */

import { timeout } from './github-auth';

const GITLAB_ORIGIN = 'https://gitlab.com';
const AUTH_PAGE_ORIGIN = 'https://auth.gitlab1s.com';
const AUTH_REDIRECT_URI = 'https://auth.gitlab1s.com/api/gitlab-auth-callback';
const CLIENT_ID = '5ef142320efe9d2e8caeb0185771bb126d3035dc0a325c6ad5bab567f320d564';
const OPEN_WINDOW_FEATURES =
	'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150';

const createRandomString = (length: number) => {
	const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
};

const createAuthorizeUrl = (state: string) => {
	const parameters = Object.entries({
		state,
		scope: 'read_api',
		response_type: 'code',
		client_id: CLIENT_ID,
		redirect_uri: AUTH_REDIRECT_URI,
	}).map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
	return `${GITLAB_ORIGIN}/oauth/authorize?${parameters.join('&')}`;
};

// https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-flow
export const ConnectToGitLab = async () => {
	const STATE = createRandomString(32);
	const opener = window.open(createAuthorizeUrl(STATE), '_blank', OPEN_WINDOW_FEATURES);

	return new Promise((resolve) => {
		const handleAuthMessage = (event: MessageEvent) => {
			// Note that though the browser block opening window and popup a tip,
			// the user can be still open it from the tip. In this case, the `opener`
			// is null, and we should still process the authorizing message
			const isValidOpener = !!(opener && event.source === opener);
			const isValidOrigin = event.origin === AUTH_PAGE_ORIGIN;
			const isValidResponse = event.data ? event.data.type === 'authorizing' : false;
			if (!isValidOpener || !isValidOrigin || !isValidResponse) {
				return;
			}
			window.removeEventListener('message', handleAuthMessage);
			resolve(event.data?.payload);
		};

		window.addEventListener('message', handleAuthMessage);
		// if there isn't any message from opener window in 300s, remove the message handler
		timeout(300 * 1000).then(() => {
			window.removeEventListener('message', handleAuthMessage);
			resolve({ error: 'authorizing_timeout', error_description: 'Authorizing timeout' });
		});
	});
};
