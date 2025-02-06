#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { executeCommand, PROJECT_ROOT } from './utils.js';

const main = () => {
	const extensions = fs.readdirSync(path.join(PROJECT_ROOT, 'extensions'));
	for (const extension of extensions) {
		const extensionPath = path.join(PROJECT_ROOT, 'extensions', extension);
		executeCommand('npm', ['install', '--no-save'], extensionPath);
	}
};

main();
