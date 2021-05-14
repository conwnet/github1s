/**
 * @file Authorizing to GitHub with OAuth App flow
 * @doc https://docs.github.com/en/developers/apps/authorizing-oauth-apps
 * @author netcon
 */

const CLIENT_ID = 'eae6621348403ea49103';
const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?scope=repo,user:email&client_id=${CLIENT_ID}`

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type AuthMessageData =
	| { access_token: string; token_type?: string; scope?: string }
	| { error: string; error_description: string; error_uri?: string };

export const getGitHubAccessToken = () => {
	const opener = window.open(GITHUB_AUTH_URL, '_blank', 'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150');

	return new Promise<AuthMessageData>((resolve) => {
		// if this function isn't called by a user event,
		// the browser may block opening a new window
		if (!opener) {
			resolve({ error: 'unable_to_open_window', error_description: 'Unable to open window' });
		}

		const handleAuthMessage = (event: MessageEvent<AuthMessageData>) => {
			// only handle message from `opener`
			if (event.source !== opener) {
					return;
			}
			window.removeEventListener('message', handleAuthMessage);
			resolve(event.data);
		};

		window.addEventListener('message', handleAuthMessage);
		// if there isn't any message from opener window in 300s, remove the message handler
		timeout(300 * 1000).then(() => {
			window.removeEventListener('message', handleAuthMessage);
			resolve({ error: 'authorizing_timeout', error_description: 'Authorizing timeout' });
		});
	});
};
