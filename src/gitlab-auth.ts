/**
 * @file connect to gitlab
 * @author netcon
 */

import { timeout, createOAuthState } from './github-auth';

const GITLAB_ORIGIN = 'https://gitlab.com';
const OAUTH_REDIRECT_URI = `${location.origin}/api/gitlab-auth-callback`;
const OPEN_WINDOW_FEATURES =
	'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150';

const createAuthorizeUrl = (state: string) => {
	const parameters = Object.entries({
		state,
		scope: 'read_api',
		response_type: 'code',
		client_id: GITLAB_OAUTH_ID,
		redirect_uri: OAUTH_REDIRECT_URI,
	}).map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
	return `${GITLAB_ORIGIN}/oauth/authorize?${parameters.join('&')}`;
};

// https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-flow
export const ConnectToGitLab = async () => {
	const STATE = createOAuthState();
	const opener = window.open(createAuthorizeUrl(STATE), '_blank', OPEN_WINDOW_FEATURES);

	return new Promise((resolve) => {
		const handleAuthMessage = (event: MessageEvent) => {
			// Note that though the browser block opening window and popup a tip,
			// the user can be still open it from the tip. In this case, the `opener`
			// is null, and we should still process the authorizing message
			const isValidOpener = !!(opener && event.source === opener);
			const isValidOrigin = event.origin === location.origin;
			const isValidResponse = event.data ? event.data.type === 'authorizing' : false;
			const isValidState = event.data ? event.data.state === STATE : false;
			if (!isValidOpener || !isValidOrigin || !isValidResponse || !isValidState) {
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
