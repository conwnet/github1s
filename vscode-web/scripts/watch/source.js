#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import chokidar from 'chokidar';
import { PROJECT_ROOT, patchSourceFile } from '../utils.js';

const fileChangeHandler = (_event, file) => {
	if (fs.statSync(file).isFile()) {
		patchSourceFile(file);
		console.log(`${path.relative(PROJECT_ROOT, file)} patched`);
	}
};

const main = () => {
	const srcWatcher = chokidar.watch(path.join(PROJECT_ROOT, 'src'));
	srcWatcher.on('all', fileChangeHandler);

	if (fs.existsSync(path.join(PROJECT_ROOT, 'extensions'))) {
		const extensionsWatcher = chokidar.watch(path.join(PROJECT_ROOT, 'extensions'));
		extensionsWatcher.on('all', fileChangeHandler);
	}
};

main();
