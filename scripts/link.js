#!/usr/bin/env node

import path from 'path';
import { executeCommand, PROJECT_ROOT } from './utils.js';

const main = () => {
	const distPath = path.join(PROJECT_ROOT, 'vscode-web/dist');
	executeCommand('npm', ['link'], distPath);
	executeCommand('npm', ['link', '@github1s/vscode-web'], PROJECT_ROOT);
};

main();
