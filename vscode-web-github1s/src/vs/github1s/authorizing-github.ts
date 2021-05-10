/**
 * @file Authorizing to GitHub with OAuth App flow
 * @doc https://docs.github.com/en/developers/apps/authorizing-oauth-apps
 * @author netcon
 */

const CLIENT_ID = '';

const authorizingGitHub = () => {
	const state = Date.now() + '' + Math.random();
	const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&state=${state}`;
	const opener = window.open(authUrl, '_blank', 'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150');

	if (!opener) {
		return;
	}

	opener.onmessage = event => {
		if (event.data) {
			return;
		}
	};
};
