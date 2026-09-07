/**
 * @file Same-origin proxy for GitHub REST code search
 */

export const onRequest: PagesFunction = async ({ request }) => {
	const url = new URL(request.url);
	const origin = request.headers.get('origin');
	const headers = new Headers({ 'cache-control': 'no-store' });
	const errorResponse = (status: number, message: string) => Response.json({ message }, { status, headers });

	if (origin && origin !== url.origin) {
		return errorResponse(403, 'Origin is not allowed.');
	}
	if (request.method !== 'GET') {
		headers.set('allow', 'GET');
		return errorResponse(405, 'Method is not allowed.');
	}
	if (!url.searchParams.get('q')?.trim()) {
		return errorResponse(400, 'The q parameter is required.');
	}

	// Keep the target fixed and forward only API headers, never browser cookies or Origin.
	const upstream = new URL('https://api.github.com/search/code');
	for (const name of ['q', 'page', 'per_page']) {
		const value = url.searchParams.get(name);
		if (value !== null) upstream.searchParams.set(name, value);
	}
	const requestHeaders = new Headers({
		accept: request.headers.get('accept') || 'application/vnd.github+json',
		'user-agent': 'GitHub1s',
		'cache-control': 'no-store',
	});
	for (const name of ['authorization', 'x-github-api-version']) {
		const value = request.headers.get(name);
		if (value) requestHeaders.set(name, value);
	}
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000);
	try {
		const response = await fetch(upstream, {
			headers: requestHeaders,
			redirect: 'error',
			signal: controller.signal,
			cf: { cacheTtlByStatus: { '100-599': -1 } },
		});
		for (const name of [
			'content-type',
			'link',
			'retry-after',
			'x-ratelimit-limit',
			'x-ratelimit-remaining',
			'x-ratelimit-reset',
		]) {
			const value = response.headers.get(name);
			if (value) headers.set(name, value);
		}
		return new Response(await response.arrayBuffer(), { status: response.status, headers });
	} catch {
		return errorResponse(controller.signal.aborted ? 504 : 502, 'GitHub code search is unavailable. Please try again.');
	} finally {
		clearTimeout(timeout);
	}
};
