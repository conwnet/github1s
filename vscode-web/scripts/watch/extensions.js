#!/usr/bin/env node

import path from 'path';
import { executeCommand, PROJECT_ROOT } from '../utils.js';

const main = () => {
	const cwd = path.join(PROJECT_ROOT, 'lib/vscode');
	executeCommand('npm', ['run', 'watch-web'], cwd);
};

main();
