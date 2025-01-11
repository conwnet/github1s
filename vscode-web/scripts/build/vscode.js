#!/usr/bin/env node

import path from 'path';
import cp from 'child_process';
import { PROJECT_ROOT } from '../utils.js';

const main = () => {
	const cwd = path.join(PROJECT_ROOT, 'lib/vscode');
	cp.spawnSync('npm', ['run', 'gulp', 'vscode-web-min'], { stdio: 'inherit', cwd });
};

main();
