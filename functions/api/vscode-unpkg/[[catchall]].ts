/**
 * @file proxy vscode-unpkg.net
 * @author netcon
 */

export const onRequest: PagesFunction = async ({ request }) => {
	const pathname = new URL(request.url).pathname || '';
	const matches = pathname.match(/^\/api\/vscode-unpkg\/([^/]+)\/(.*)/);

	if (!matches) {
		return new Response('Not found', { status: 404 });
	}

	const publisher = matches[1];
	const restPartsPath = matches[2];
	const requestUrl = `https://${publisher}.vscode-unpkg.net/${publisher}/${restPartsPath}`;

	try {
		const response = await fetch(requestUrl);
		return response.arrayBuffer().then((buffer) => {
			return new Response(buffer, { status: response.status });
		});
	} catch (e) {
		return new Response('Unknown Error', { status: 500 });
	}
};
