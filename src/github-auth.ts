/**
 * @file connect to github
 * @author netcon
 */

import { createOAuthState, waitForOAuthResult } from './oauth-web';

export { createOAuthState } from './oauth-web';

const GITHUB_ORIGIN = 'https://github.com';
const OAUTH_REDIRECT_URI = `${location.origin}/api/github-auth-callback`;
const OPEN_WINDOW_FEATURES =
	'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150';

const createAuthorizeUrl = (state: string) => {
	const parameters = Object.entries({
		state,
		scope: 'repo,user:email',
		client_id: GITHUB_OAUTH_ID,
		redirect_uri: OAUTH_REDIRECT_URI,
	}).map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
	return `${GITHUB_ORIGIN}/login/oauth/authorize?${parameters.join('&')}`;
};

export const ConnectToGitHub = () => {
	const STATE = createOAuthState();
	const opener = window.open(createAuthorizeUrl(STATE), '_blank', OPEN_WINDOW_FEATURES);
	return waitForOAuthResult(STATE, opener);
};
