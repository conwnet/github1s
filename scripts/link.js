#!/usr/bin/env node

import path from 'path';
import cp from 'child_process';
import { PROJECT_ROOT } from './utils.js';

const main = () => {
	const distPath = path.join(PROJECT_ROOT, 'vscode-web/dist');
	cp.spawnSync('npm', ['link'], { cwd: distPath, stdio: 'inherit' });
	cp.spawnSync('npm', ['link', '@github1s/vscode-web'], { cwd: PROJECT_ROOT, stdio: 'inherit' });
};

main();
