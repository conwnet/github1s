#!/usr/bin/env node

const url = require('url');
const fs = require('fs');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');
const httpProxy = require('http-proxy');

const APP_ROOT = path.join(__dirname, '..');
const options = { public: path.join(APP_ROOT, 'dist'), cleanUrls: false };

// now sourcegraph graphql api is refused the CORS check
// just proxy the request to sourcegraph directly for a taste
const sourcegraphProxy = httpProxy.createProxyServer({
	target: 'https://sourcegraph.com/.api/graphql',
	ignorePath: true,
	changeOrigin: false,
	headers: {
		host: 'sourcegraph.com',
	},
});

const handleProxyError = (error) => {
	res.writeHead(500, {
		'Content-Type': 'application/json',
	});
	res.end(JSON.stringify({ message: error.message }));
};

const sourcegraphProxyHandler = (req, res) => {
	sourcegraphProxy.web(req, res);
	sourcegraphProxy.on('error', handleProxyError);
};

// proxy the request to vscode-unpkg.net
const vscodeUnpkgProxyHandler = (req, res, vscodeUnpkgMatches) => {
	const publisher = vscodeUnpkgMatches[1];
	const restPartsPath = vscodeUnpkgMatches[2];
	const host = `${publisher}.vscode-unpkg.net`;
	const proxy = httpProxy.createServer({
		target: `https://${host}/${publisher}/${restPartsPath}`,
		ignorePath: true,
		changeOrigin: false,
		headers: { host },
	});

	proxy.web(req, res);
	proxy.on('error', handleProxyError);
};

const server = http.createServer((request, response) => {
	const urlObj = url.parse(request.url);
	if (urlObj.pathname.startsWith('/api/sourcegraph')) {
		return sourcegraphProxyHandler(request, response);
	}

	// prettier-ignore
	const vscodeUnpkgMatches = urlObj.pathname.match(/^\/api\/vscode-unpkg\/([^/]+)\/(.*)/);
	if (vscodeUnpkgMatches) {
		return vscodeUnpkgProxyHandler(request, response, vscodeUnpkgMatches);
	}

	return fs.access(
		path.join(APP_ROOT, 'dist', urlObj.pathname),
		fs.constants.F_OK,
		(error) => {
			if (!error && urlObj.pathname !== '/') {
				return handler(request, response, options);
			}
			return handler(request, response, {
				rewrites: [{ source: '*', destination: '/index.html' }],
				...options,
			});
		}
	);
});

server.listen(5000, () => {
	console.log('Running GitHub1s at http://localhost:5000');
});
