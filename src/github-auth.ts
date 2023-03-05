/**
 * @file connect to github
 * @author netcon
 */

const CLIENT_ID = 'eae6621348403ea49103';
const GITHUB_ORIGIN = 'https://github.com';
const GITHUB_AUTH_URL = `${GITHUB_ORIGIN}/login/oauth/authorize?scope=repo,user:email&client_id=${CLIENT_ID}`;
const OPEN_WINDOW_FEATURES =
	'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150';
const AUTH_PAGE_ORIGIN = 'https://auth.github1s.com';

const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const ConnectToGitHub = () => {
	const opener = window.open(GITHUB_AUTH_URL, '_blank', OPEN_WINDOW_FEATURES);

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
