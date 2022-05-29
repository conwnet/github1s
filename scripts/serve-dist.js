const url = require('url');
const http = require('http');
const httpProxy = require('http-proxy');

const _proxyServer = httpProxy.createServer({
	ignorePath: true,
	changeOrigin: false,
});

const handleProxyError = (error, req, res) => {
	console.trace(error);
	res.writeHead(500, {
		'Content-Type': 'application/json',
	});
	res.end(JSON.stringify({ message: error.message }));
};

_proxyServer.on('error', handleProxyError);

// proxy the request to vscode-unpkg.net
const vscodeUnpkgProxyHandler = (req, res, vscodeUnpkgMatches) => {
	if (!vscodeUnpkgMatches) {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		return res.end(
			JSON.stringify({
				error: `${req.url} Not Found`,
			})
		);
	}
	const publisher = vscodeUnpkgMatches[1];
	const restPartsPath = vscodeUnpkgMatches[2];
	const host = `${publisher}.vscode-unpkg.net`.toLowerCase();
	const target = `https://${host}/${publisher}/${restPartsPath}`;
	const headers = { host };
	_proxyServer.web(req, res, { target, headers });
};

const proxyServer = http.createServer((request, response) => {
	const urlObj = url.parse(request.url);
	const vscodeUnpkgMatches = urlObj.pathname.match(/^\/api\/vscode-unpkg\/([^/]+)\/(.*)/);
	return vscodeUnpkgProxyHandler(request, response, vscodeUnpkgMatches);
});

module.exports = proxyServer;
