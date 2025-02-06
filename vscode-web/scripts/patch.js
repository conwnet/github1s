#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { PROJECT_ROOT, getAllFiles, patchSourceFile } from './utils.js';

const main = () => {
	const sourceFiles = getAllFiles(path.join(PROJECT_ROOT, 'src'));
	if (fs.existsSync(path.join(PROJECT_ROOT, 'extensions'))) {
		sourceFiles.push(...getAllFiles(path.join(PROJECT_ROOT, 'extensions')));
	}

	for (const sourceFile of sourceFiles) {
		patchSourceFile(sourceFile);
	}
};

main();
