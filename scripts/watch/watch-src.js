#!/usr/bin/env node

const chokidar = require('chokidar');
const path = require('path');
const cp = require('child_process');

const APP_ROOT = path.join(__dirname, '../..');

const main = () => {
	const SOURCE = path.join(APP_ROOT, 'src');
	const TARGET = path.join(APP_ROOT, 'lib/vscode/src');
	const watcher = chokidar.watch(SOURCE);

	watcher.on('all', () => {
		cp.exec(`rsync -a ${SOURCE}/ ${TARGET}`);
	});
};

main();
