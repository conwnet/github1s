/**
 * @file github auth callback
 * @author netcon
 */

const createResponseHtml = (text: string, script: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<title>Connect to GitHub</title>
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
	GITHUB_OAUTH_ID: string;
	GITHUB_OAUTH_SECRET: string;
	GITHUB1S_ALLOWED_ORIGINS: string;
}> = async ({ request, env }) => {
	const code = new URL(request.url).searchParams.get('code');

	const createResponse = (status, data) => {
		const body = createAuthorizeResultHtml(data, env.GITHUB1S_ALLOWED_ORIGINS);
		return new Response(body, { status, headers: { 'content-type': 'text/html' } });
	};

	if (!code) {
		return createResponse(401, MISSING_CODE_ERROR);
	}

	try {
		// https://docs.github.com/en/developers/apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			body: JSON.stringify({ client_id: env.GITHUB_OAUTH_ID, client_secret: env.GITHUB_OAUTH_SECRET, code }),
			headers: { accept: 'application/json', 'content-type': 'application/json' },
		});
		return response.json().then((result) => createResponse(response.status, result));
	} catch (e) {
		return createResponse(500, UNKNOWN_ERROR);
	}
};
