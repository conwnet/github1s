#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');

const APP_ROOT = path.join(__dirname, '../..');
const enableExtensions =
	require(path.join(APP_ROOT, 'resources/builtin-extensions.json')) || [];

const main = () => {
	const extensions = fs.readdirSync(path.join(APP_ROOT, 'extensions'));
	extensions.forEach((extension) => {
		fs.copySync(
			path.join(APP_ROOT, 'extensions', extension),
			path.join(path.join(APP_ROOT, 'dist/static/extensions'), extension),
			{ filter: (src) => !src.includes('node_modules') }
		);
	});
};

main();
