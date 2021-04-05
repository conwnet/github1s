#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');

const APP_ROOT = path.join(__dirname, '..');
const TARGET_DIR = path.join(APP_ROOT, 'dist/extensions');
const enableExtensions =
	require(path.join(APP_ROOT, 'resources/builtin-extensions.json')) || [];

const main = () => {
	fs.ensureDirSync(TARGET_DIR);

	enableExtensions.forEach((extension) => {
		fs.copySync(
			path.join(APP_ROOT, 'lib/vscode', extension.path),
			path.join(TARGET_DIR, path.basename(extension.path)),
			{
				filter: (src) => {
					// we don't have to copy `node_modules` because the browser version's
					// vscode won't use the file in it. we also should not copy the .gitignore
					// file because it will make some necessary files won't publish to npm
					return !src.includes('node_modules') && !src.endsWith('.gitignore');
				},
			}
		);
	});
};

main();
