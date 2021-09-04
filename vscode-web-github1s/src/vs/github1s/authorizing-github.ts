/* eslint-disable header/header */
/**
 * @file Authorizing to GitHub with OAuth App flow
 * @doc https://docs.github.com/en/developers/apps/authorizing-oauth-apps
 * @author netcon
 */

import { commands } from 'vs/workbench/workbench.web.api';

const CLIENT_ID = 'eae6621348403ea49103';
const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?scope=repo,user:email&client_id=${CLIENT_ID}`;
const OPEN_WINDOW_FEATURES = 'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150';
const AUTH_PAGE_ORIGIN = 'https://auth.github1s.com';

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type AuthMessageData =
	| { access_token: string; token_type?: string; scope?: string }
	| { error: string; error_description: string; error_uri?: string };

export const getGitHubAccessToken = (retryWithOverlay: boolean = false) => {
	const opener = window.open(GITHUB_AUTH_URL, '_blank', OPEN_WINDOW_FEATURES);

	return new Promise<AuthMessageData>((resolve) => {
		let overlayOpened = false;
		// if this function isn't called by a user event,
		// the browser may block opening a new window,
		// open the overlay to try authorizing again in this case
		if (!opener && retryWithOverlay) {
			overlayOpened = true;
			commands.executeCommand('github1s.vscode.get-github-access-token-with-overlay')
				.then(data => resolve(data as AuthMessageData));
		}

		const handleAuthMessage = (event: MessageEvent<{ type: string, payload: AuthMessageData }>) => {
			// Note that though the browser block opening window and popup a tip,
			// the user can be still open it from the tip. In this case, the `opener`
			// is null, and we should still process the authorizing message
			if (event.origin !== AUTH_PAGE_ORIGIN || (opener && event.source !== opener) || event.data?.type !== 'authorizing') {
				return;
			}
			// if we have retried with overlay, but we received a message from the
			// blocked window before, and there is no token in it, just ignore the message
			if (overlayOpened && !('access_token' in event.data.payload)) {
				return;
			}
			// if we get the token here, and the overlay is opened, just close it
			overlayOpened && commands.executeCommand('github1s.vscode.hide-authorizing-overlay');
			window.removeEventListener('message', handleAuthMessage);
			resolve(event.data.payload);
		};

		window.addEventListener('message', handleAuthMessage);
		// if there isn't any message from opener window in 300s, remove the message handler
		timeout(300 * 1000).then(() => {
			window.removeEventListener('message', handleAuthMessage);
			resolve({ error: 'authorizing_timeout', error_description: 'Authorizing timeout' });
		});
	});
};
