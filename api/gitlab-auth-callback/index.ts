/**
 * @file gitlab auth callback
 * @author netcon
 */

import got from 'got';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.GITLAB_OAUTH_ID || '';
const CLIENT_SECRET = process.env.GITLAB_OAUTH_SECRET || '';
// allow origins should split by ','
const ALLOWED_ORIGINS = process.env.GITLAB1S_ALLOWED_ORIGINS || '';
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
const createAuthorizeResultHtml = (data: Record<any, any>) => {
	const errorText = 'Failed! You can close this window and retry.';
	const successText = 'Connected! You can now close this window.';
	const resultStr = `{ type: 'authorizing', payload: ${JSON.stringify(data)} }`;
	const script = `
	'${ALLOWED_ORIGINS}'.split(',').forEach(function(allowedOrigin) {
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

// https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-flow
export default async (req: VercelRequest, res: VercelResponse) => {
	const code = req.query.code;
	const sendResponseHtml = (status, data) => {
		res.status(status);
		res.send(createAuthorizeResultHtml(data));
	};

	if (!code) {
		return sendResponseHtml(401, MISSING_CODE_ERROR);
	}

	try {
		const response = await got.post('https://gitlab.com/oauth/token', {
			form: {
				code,
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				redirect_uri: AUTH_REDIRECT_URI,
				grant_type: 'authorization_code',
			},
			responseType: 'json',
		});
		return sendResponseHtml(response.statusCode, response.body);
	} catch (e) {
		return sendResponseHtml(500, UNKNOWN_ERROR);
	}
};
