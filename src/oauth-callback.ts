import { getOAuthBroadcastChannelName } from './oauth-common';

export const MISSING_CODE_ERROR = {
	error: 'request_invalid',
	error_description: 'Missing code',
};
export const INVALID_ORIGIN_ERROR = {
	error: 'request_invalid',
	error_description: 'Invalid origin',
};
export const UNKNOWN_ERROR = {
	error: 'internal_error',
	error_description: 'Unknown error',
};

const createResponseHtml = (title: string, text: string, script: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<title>${title}</title>
</head>
<body>
	<h1>${text}</h1>
	<script>${script}</script>
</body>
</html>
`;

export const createAuthorizeResultHtml = (
	title: string,
	data: Record<string, unknown>,
	state: string,
	origin: string,
) => {
	const sanitizedState = state.replace(/[^a-zA-Z0-9]/g, '');
	const result = {
		type: 'authorizing',
		payload: data,
		state: sanitizedState,
	};
	const resultStr = JSON.stringify(result).replace(/</g, '\\u003c');
	const channelName = JSON.stringify(getOAuthBroadcastChannelName(sanitizedState));
	const script = `
	const result = ${resultStr};
	if (typeof BroadcastChannel !== 'undefined') {
		const channel = new BroadcastChannel(${channelName});
		channel.postMessage(result);
		channel.close();
	}
	if (window.opener) {
		window.opener.postMessage(result, ${JSON.stringify(origin)});
	}
	${data.error ? '' : 'setTimeout(function() { window.close(); }, 50);'}`;
	const text = data.error
		? 'Failed! You can close this window and retry.'
		: 'Connected! You can close this window now.';
	return createResponseHtml(title, text, script);
};
