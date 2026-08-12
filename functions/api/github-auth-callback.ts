/**
 * @file github auth callback
 * @author netcon
 */

import {
	createAuthorizeResultHtml,
	INVALID_ORIGIN_ERROR,
	MISSING_CODE_ERROR,
	UNKNOWN_ERROR,
} from '../../src/oauth-callback';

export const onRequest: PagesFunction<{
	GITHUB_OAUTH_ID: string;
	GITHUB_OAUTH_SECRET: string;
	GITHUB1S_ALLOWED_ORIGINS: string;
}> = async ({ request, env }) => {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get('code');
	const allowedOrigins = env.GITHUB1S_ALLOWED_ORIGINS.split(',')
		.map((item) => item.trim())
		.filter(Boolean);

	const createResponse = (status: number, data: Record<string, unknown>) => {
		const state = searchParams.get('state') || '';
		const body = createAuthorizeResultHtml('Connect to GitHub', data, state, origin);
		return new Response(body, { status, headers: { 'content-type': 'text/html' } });
	};

	if (!code) {
		return createResponse(401, MISSING_CODE_ERROR);
	}

	if (!allowedOrigins.includes(origin)) {
		return createResponse(401, INVALID_ORIGIN_ERROR);
	}

	try {
		// https://docs.github.com/en/developers/apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			body: JSON.stringify({
				code,
				client_id: env.GITHUB_OAUTH_ID,
				client_secret: env.GITHUB_OAUTH_SECRET,
				redirect_uri: `${origin}/api/github-auth-callback`,
			}),
			headers: { accept: 'application/json', 'content-type': 'application/json' },
		});
		const result = (await response.json()) as Record<string, unknown>;
		return createResponse(response.status, result);
	} catch (e) {
		return createResponse(500, UNKNOWN_ERROR);
	}
};
