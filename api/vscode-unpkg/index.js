/**
 * @file proxy vscode-unpkg.net
 * @author netcon
 */

const got = require('got');
const url = require('url');

module.exports = async (req, res) => {
	const pathname = new url.parse(req.url || '').pathname || '';
	const matches = pathname.match(/^\/api\/vscode-unpkg\/([^/]+)\/(.*)/);

	if (!matches) {
		res.status(404);
		return res.send('Not found');
	}

	const publisher = matches[1];
	const restPartsPath = matches[2];
	const requestUrl = `https://${publisher}.vscode-unpkg.net/${publisher}/${restPartsPath}`;
	const response = await got.get(requestUrl);

	res.status(response.statusCode);
	return res.send(response.body);
};
