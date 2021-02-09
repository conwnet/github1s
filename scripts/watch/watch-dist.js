#!/usr/bin/env node

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const cp = require('child_process');
const util = require('util');

const APP_ROOT = path.join(__dirname, '../..');

const debounce = (func, delay) => {
	let timer = null;
	let lastResult = null;
	return function () {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			lastResult = func.apply(this, Array.prototype.slice.call(arguments, 0));
		}, delay);
		return lastResult;
	};
};

const autoSyncVscodeOut = async () => {
	const SOURCE = path.join(APP_ROOT, 'lib/vscode/out');
	const TARGET = path.join(APP_ROOT, 'dist/static/vscode');

	await util.promisify(cp.exec)(`rsync -a ${SOURCE}/ ${TARGET}`);

	chokidar.watch(SOURCE).on('all', debounce((_, path) => {
		cp.exec(`rsync -a ${SOURCE}/ ${TARGET}`);
		console.log(`sync ${path}`);
	}, 300));
};

const autoSyncGitHub1sExtension = async () => {
	const SOURCE = path.join(APP_ROOT, 'extensions');
	const TARGET = path.join(APP_ROOT, 'dist/static/extensions');

	await util.promisify(cp.exec)(`rsync -a ${SOURCE}/ ${TARGET}`);

	chokidar.watch(SOURCE).on('all', debounce((_, path) => {
		cp.exec(`rsync -a ${SOURCE}/ ${TARGET}`);
		console.log(`sync ${path}`);
	}, 300));
};

const main = () => {
	fs.ensureDirSync(path.join(APP_ROOT, 'dist/static'));

	autoSyncVscodeOut();
	autoSyncGitHub1sExtension();
};

main();

