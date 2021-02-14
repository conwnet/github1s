#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');

const APP_ROOT = path.join(__dirname, '../..');
const TARGET_DIR = path.join(APP_ROOT, 'dist/static/node_modules/vscode-web/dist/extensions');

const main = () => {
	fs.ensureDirSync(TARGET_DIR);

	const extensions = fs.readdirSync(path.join(APP_ROOT, 'extensions'));
	extensions.forEach(extension => {
		fs.copySync(
			path.join(APP_ROOT, 'extensions', extension),
			path.join(TARGET_DIR, extension),
			{ filter: src => !src.includes('node_modules') }
		);
	});
};

main();
