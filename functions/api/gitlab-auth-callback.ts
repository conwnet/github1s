/**
 * @file gitlab auth callback
 * @author netcon
 */

import {
	createAuthorizeResultHtml,
	INVALID_ORIGIN_ERROR,
	MISSING_CODE_ERROR,
	UNKNOWN_ERROR,
} from '../../src/oauth-callback';

export const onRequest: PagesFunction<{
	GITLAB_OAUTH_ID: string;
	GITLAB_OAUTH_SECRET: string;
	GITLAB1S_ALLOWED_ORIGINS: string;
	GITLAB_OAUTH_REDIRECT_URI: string;
}> = async ({ request, env }) => {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get('code');
	const allowedOrigins = env.GITLAB1S_ALLOWED_ORIGINS.split(',')
		.map((item) => item.trim())
		.filter(Boolean);

	const createResponse = (status: number, data: Record<string, unknown>) => {
		const state = searchParams.get('state') || '';
		const body = createAuthorizeResultHtml('Connect to GitLab', data, state, origin);
		return new Response(body, { status, headers: { 'content-type': 'text/html' } });
	};

	if (!code) {
		return createResponse(401, MISSING_CODE_ERROR);
	}

	if (!allowedOrigins.includes(origin)) {
		return createResponse(401, INVALID_ORIGIN_ERROR);
	}

	try {
		// https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-flow
		const response = await fetch('https://gitlab.com/oauth/token', {
			method: 'POST',
			body: JSON.stringify({
				code,
				client_id: env.GITLAB_OAUTH_ID,
				client_secret: env.GITLAB_OAUTH_SECRET,
				redirect_uri: `${origin}/api/gitlab-auth-callback`,
				grant_type: 'authorization_code',
			}),
			headers: { accept: 'application/json', 'content-type': 'application/json' },
		});
		const result = (await response.json()) as Record<string, unknown>;
		return createResponse(response.status, result);
	} catch (e) {
		return createResponse(500, UNKNOWN_ERROR);
	}
};
