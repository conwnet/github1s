#!/usr/bin/env node

const chokidar = require('chokidar');
const path = require('path');
const cp = require('child_process');

const VSCODE_WEB_ROOT = path.join(__dirname, '../..');

const main = () => {
	const SRC_SOURCE = path.join(VSCODE_WEB_ROOT, 'src');
	const SRC_TARGET = path.join(VSCODE_WEB_ROOT, 'lib/vscode/src');
	const srcWatcher = chokidar.watch(SRC_SOURCE);

	srcWatcher.on('all', () => {
		cp.exec(`rsync -a ${SRC_SOURCE}/ ${SRC_TARGET}`);
	});

	const EXTENSIONS_SOURCE = path.join(VSCODE_WEB_ROOT, 'extensions');
	const EXTENSIONS_TARGET = path.join(VSCODE_WEB_ROOT, 'lib/vscode/extensions');
	const extensionsWatcher = chokidar.watch(EXTENSIONS_SOURCE);

	extensionsWatcher.on('all', () => {
		cp.exec(`rsync -a ${EXTENSIONS_SOURCE}/ ${EXTENSIONS_TARGET}`);
	});
};

main();
