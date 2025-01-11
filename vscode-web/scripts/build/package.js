#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { PROJECT_ROOT } from '../utils.js';

const main = () => {
	const distPath = path.join(PROJECT_ROOT, 'dist');

	fs.removeSync(distPath);
	fs.ensureDirSync(distPath);

	fs.copySync(path.join(PROJECT_ROOT, 'lib/vscode-web/out'), path.join(distPath, 'vscode'));
	fs.copySync(path.join(PROJECT_ROOT, 'lib/vscode-web/extensions'), path.join(distPath, 'extensions'));
	fs.copySync(path.join(PROJECT_ROOT, 'lib/vscode-web/node_modules'), path.join(distPath, 'dependencies'));
	fs.copyFileSync(path.join(PROJECT_ROOT, 'lib/vscode-web/favicon.ico'), path.join(distPath, 'favicon.ico'));

	fs.copyFileSync(path.join(PROJECT_ROOT, 'README.md'), path.join(distPath, 'README.md'));
	fs.copyFileSync(path.join(PROJECT_ROOT, 'index.html'), path.join(distPath, 'index.html'));
	fs.copyFileSync(path.join(PROJECT_ROOT, '.VERSION'), path.join(distPath, '.VERSION'));

	const projectInfo = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json')));
	const packageJson = {
		name: projectInfo.name,
		version: projectInfo.version,
		description: projectInfo.description,
		repository: projectInfo.repository,
		license: projectInfo.license,
		type: projectInfo.type,
		author: projectInfo.author,
		keywords: projectInfo.keywords,
	};
	fs.writeFileSync(path.join(PROJECT_ROOT, 'dist/package.json'), JSON.stringify(packageJson, null, 2));
};

main();
