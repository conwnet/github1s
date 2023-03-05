#!/usr/bin/env node

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const cp = require('child_process');
const util = require('util');

const APP_ROOT = path.join(__dirname, '../../..');
const GIT_COMMIT_ID = cp.execSync('git rev-parse HEAD').toString().trim();
const STATIC_HASH = GIT_COMMIT_ID.padStart(7, '0').slice(0, 7);

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
	const SOURCE = path.join(APP_ROOT, 'vscode-web/lib/vscode/out');
	const TARGET = path.join(APP_ROOT, `dist/static-${STATIC_HASH}/vscode`);

	fs.ensureDirSync(TARGET);
	await util
		.promisify(cp.exec)(`rsync -a ${SOURCE}/ ${TARGET}`)
		.catch(() => {});

	chokidar.watch(SOURCE).on(
		'all',
		debounce((_, path) => {
			cp.exec(`rsync -a ${SOURCE}/ ${TARGET}`);
			console.log(`sync ${path}`);
		}, 300)
	);
};

const autoSyncExtensionsOut = async () => {
	const SOURCE = path.join(APP_ROOT, 'vscode-web/lib/vscode/extensions');
	const TARGET = path.join(APP_ROOT, `dist/static-${STATIC_HASH}/extensions`);

	fs.ensureDirSync(TARGET);
	await util
		.promisify(cp.exec)(`rsync -a ${SOURCE}/ ${TARGET}`)
		.catch(() => {});

	chokidar.watch(SOURCE).on(
		'all',
		debounce((_, path) => {
			cp.exec(`rsync -a ${SOURCE}/ ${TARGET}`);
			console.log(`sync ${path}`);
		}, 300)
	);
};

const main = () => {
	autoSyncVscodeOut();
	autoSyncExtensionsOut();
};

main();
