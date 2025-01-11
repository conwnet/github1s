#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import cp from 'child_process';
import { PROJECT_ROOT } from './utils.js';

const main = () => {
	for (const extension of fs.readdirSync('extensions')) {
		const extensionPath = path.join(PROJECT_ROOT, 'extensions', extension);
		if (fs.existsSync(path.join(extensionPath, 'package.json'))) {
			cp.spawnSync('npm', ['run', 'compile'], { cwd: extensionPath, stdio: 'inherit' });
		}
	}
	cp.spawnSync('npx', ['webpack', '--mode=production'], { cwd: PROJECT_ROOT, stdio: 'inherit' });
};

main();
