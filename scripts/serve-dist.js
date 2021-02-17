#!/usr/bin/env node

const url = require('url');
const fs = require('fs');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

const APP_ROOT = path.join(__dirname, '..');
const options = { public: path.join(APP_ROOT, 'dist'), cleanUrls: false };

const server = http.createServer((request, response) => {
	const urlObj = url.parse(request.url);
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
