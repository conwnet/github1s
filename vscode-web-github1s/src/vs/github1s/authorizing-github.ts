/**
 * @file Authorizing to GitHub with OAuth App flow
 * @doc https://docs.github.com/en/developers/apps/authorizing-oauth-apps
 * @author netcon
 */

const CLIENT_ID = 'eae6621348403ea49103';
const GITHUB_AUTH_URL = `https://github.com/login/oauth/authorize?scope=repo,user:email&client_id=${CLIENT_ID}`

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type AuthMessageData =
	| { access_token: string; token_type: string; scope: string }
	| { error: string; error_description: string; error_uri?: string };

export const getGitHubAccessToken = () => new Promise<AuthMessageData>(resolve => {
	const opener = window.open(GITHUB_AUTH_URL, '_blank', 'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150');

	if (!opener) {
		return;
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
	// if there isn't any message from opener window in 180s, remove the message handler
	timeout(180 * 1000).then(() => window.removeEventListener('message', handleAuthMessage));
});
