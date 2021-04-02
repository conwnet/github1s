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

const autoSyncGitHub1sExtension = async () => {
	const SOURCE = path.join(APP_ROOT, 'extensions');
	const TARGET = path.join(APP_ROOT, 'dist/static/extensions');

	await util.promisify(cp.exec)(`rsync -a ${SOURCE}/ ${TARGET}`);

	chokidar.watch(SOURCE).on(
		'all',
		debounce((_, path) => {
			cp.exec(`rsync -a ${SOURCE}/ ${TARGET}`);
			console.log(`sync ${path}`);
		}, 300)
	);
};

// regenerate the config when `extensions/github1s/packages.json` has changed
const autoRegenerateConfig = async () => {
	const packagePath = path.join(APP_ROOT, 'extensions/github1s/package.json');
	const scriptPath = path.join(APP_ROOT, 'scripts/package/generate-config.js');

	chokidar.watch(packagePath).on(
		'all',
		debounce(() => {
			cp.exec(`node ${scriptPath}`);
			console.log(`the config has updated`);
		}, 300)
	);
};

const main = () => {
	fs.ensureDirSync(path.join(APP_ROOT, 'dist/static'));

	autoSyncGitHub1sExtension();
	autoRegenerateConfig();
};

main();
