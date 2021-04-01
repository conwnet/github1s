#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');

const APP_ROOT = path.join(__dirname, '../..');
const TARGET_DIR = path.join(APP_ROOT, 'vscode-web-github1s/dist/extensions');
const enableExtensions =
	require(path.join(APP_ROOT, 'resources/builtin-extensions.json')) || [];

const main = () => {
	fs.ensureDirSync(TARGET_DIR);

	enableExtensions.forEach((extension) => {
		fs.copySync(
			path.join(APP_ROOT, 'lib/vscode', extension.path),
			path.join(TARGET_DIR, path.basename(extension.path)),
			{ filter: (src) => !src.includes('node_modules') }
		);
	});

	// TODO: Split this from vscode built in
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
