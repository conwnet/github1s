/**
 * @file github auth callback
 * @author netcon
 */

const got = require('got');

const CLIENT_ID = process.env.GITHUB_OAUTH_ID || '';
const CLIENT_SECRET = process.env.GITHUB_OAUTH_SECRET || '';
const APP_ORIGIN = process.env.APP_ORIGIN || '';

// return the data to the opener window by postMessage API,
// and close current window then
const getResponseHtml = (dataStr) => `
<script>
window.opener && window.opener.postMessage(${dataStr}, '${APP_ORIGIN}' || window.location.origin);
setTimeout(() => window.close(), 50);
</script>
`;

const MISSING_CODE_ERROR = {
	error: 'request_invalid',
	error_description: 'Missing code',
};
const UNKNOWN_ERROR = {
	error: 'internal_error',
	error_description: 'Unknown error',
};

module.exports = async (req, res) => {
	const code = req.query.code;
	const sendResponseHtml = (status, data) => {
		res.status(status);
		res.send(getResponseHtml(JSON.stringify(data)));
	};

	if (!code) {
		return sendResponseHtml(401, MISSING_CODE_ERROR);
	}

	try {
		// https://docs.github.com/en/developers/apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
		const response = await got.post(
			'https://github.com/login/oauth/access_token',
			{
				json: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code },
				responseType: 'json',
			}
		);
		return sendResponseHtml(response.statusCode, response.body);
	} catch (e) {
		// the error is responded by GitHub
		if (e.response) {
			return sendResponseHtml(e.response.statusCode, e.response.body);
		}
		return sendResponseHtml(500, UNKNOWN_ERROR);
	}
};
