/**
 * @file gitlab auth callback
 * @author netcon
 */

const AUTH_REDIRECT_URI = 'https://auth.gitlab1s.com/api/gitlab-auth-callback';

const createResponseHtml = (text: string, script: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<title>Connect to GitLab</title>
</head>
<body>
	<h1>${text}</h1>
	<script>${script}</script>
</body>
</html>
`;

// return the data to the opener window by postMessage API,
// and close current window if successfully connected
const createAuthorizeResultHtml = (data: Record<any, any>, origins: string) => {
	const errorText = 'Failed! You can close this window and retry.';
	const successText = 'Connected! You can now close this window.';
	const resultStr = `{ type: 'authorizing', payload: ${JSON.stringify(data)} }`;
	const script = `
	'${origins}'.split(',').forEach(function(allowedOrigin) {
		window.opener.postMessage(${resultStr}, allowedOrigin);
	});
	${data.error ? '' : 'setTimeout(() => window.close(), 50);'}`;
	return createResponseHtml(data.error ? errorText : successText, script);
};

const MISSING_CODE_ERROR = {
	error: 'request_invalid',
	error_description: 'Missing code',
};
const UNKNOWN_ERROR = {
	error: 'internal_error',
	error_description: 'Unknown error',
};

export const onRequest: PagesFunction<{
	GITLAB_OAUTH_ID: string;
	GITLAB_OAUTH_SECRET: string;
	GITLAB1S_ALLOWED_ORIGINS: string;
}> = async ({ request, env }) => {
	const code = new URL(request.url).searchParams.get('code');

	const createResponse = (status, data) => {
		const body = createAuthorizeResultHtml(data, env.GITLAB1S_ALLOWED_ORIGINS);
		return new Response(body, { status, headers: { 'content-type': 'text/html' } });
	};

	if (!code) {
		return createResponse(401, MISSING_CODE_ERROR);
	}

	try {
		// https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-flow
		const response = await fetch('https://gitlab.com/oauth/token', {
			method: 'POST',
			body: JSON.stringify({
				code,
				client_id: env.GITLAB_OAUTH_ID,
				client_secret: env.GITLAB_OAUTH_SECRET,
				redirect_uri: AUTH_REDIRECT_URI,
				grant_type: 'authorization_code',
			}),
			headers: { accept: 'application/json', 'content-type': 'application/json' },
		});
		return response.json().then((result) => createResponse(response.status, result));
	} catch (e) {
		return createResponse(500, UNKNOWN_ERROR);
	}
};
