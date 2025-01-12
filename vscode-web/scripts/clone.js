#!/usr/bin/env node

import path from 'path';
import cp from 'child_process';
import fs from 'fs-extra';
import crypto from 'crypto';
import { executeCommand, PROJECT_ROOT, getAllFiles } from './utils.js';

const fixSourceFiles = () => {
	const getDiffFiles = (base) => {
		return getAllFiles(path.join(PROJECT_ROOT, base)).map((file) => {
			return path.relative(PROJECT_ROOT, file);
		});
	};

	const diffFiles = getDiffFiles('src');
	if (fs.existsSync(path.join(PROJECT_ROOT, 'extensions'))) {
		diffFiles.push(...getDiffFiles('extensions'));
	}

	let hasSourceUpdated = false;
	const shasPath = path.join(PROJECT_ROOT, 'scripts/.patch');
	const fileShas = JSON.parse(fs.readFileSync(shasPath));

	for (const file of diffFiles) {
		const vscodeFile = path.join(PROJECT_ROOT, 'lib/vscode', file);
		if (!fs.existsSync(vscodeFile)) {
			continue;
		}

		const hashSum = crypto.createHash('sha256');
		hashSum.update(fs.readFileSync(vscodeFile));
		const fileSha = hashSum.digest('hex');

		if (fileShas[file] !== fileSha) {
			const sourceFile = path.join(PROJECT_ROOT, file);
			cp.execSync(`code -r -w -d ${vscodeFile} ${sourceFile}`);
			fileShas[file] = fileSha;
			hasSourceUpdated = true;
		}
	}

	if (hasSourceUpdated) {
		fs.writeFileSync(shasPath, JSON.stringify(fileShas, null, 2));
	}
};

const main = () => {
	if (fs.existsSync(path.join(PROJECT_ROOT, 'lib/vscode'))) {
		return;
	}

	const url = 'https://github.com/microsoft/vscode.git';
	const ref = cp.execSync(`cat ${PROJECT_ROOT}/.VERSION`).toString();
	executeCommand('git', ['clone', '--depth', '1', '-b', ref, url, 'lib/vscode'], PROJECT_ROOT);

	const locUrl = 'https://github.com/microsoft/vscode-loc.git';
	executeCommand('git', ['clone', '--depth', '1', locUrl, 'lib/vscode-loc'], PROJECT_ROOT);

	fixSourceFiles();

	const vscodePath = path.join(PROJECT_ROOT, 'lib/vscode');
	executeCommand('npm', ['install'], vscodePath);
};

main();
