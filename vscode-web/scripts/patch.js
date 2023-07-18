#!/usr/bin/env node

const crypto = require('crypto');

const path = require('path');
const cp = require('child_process');
const fsPromise = require('fs/promises');

const APP_ROOT = path.join(__dirname, '..');

const SRC_SOURCE = path.join(APP_ROOT, 'src');
const SRC_TARGET = path.join(APP_ROOT, 'lib/vscode/src');

let config = {};
let needUpdate = false;

async function patch(root = []) {
	const files = await fsPromise.readdir(path.join(SRC_SOURCE, ...root));

	for (const file of files) {
		const filePath = path.join(SRC_SOURCE, ...root, file);
		const fileStat = await fsPromise.stat(filePath);
		if (fileStat.isFile()) {
			const targetFile = path.join(SRC_TARGET, ...root, file);
			const content = await fsPromise.readFile(targetFile);
			const hashSum = crypto.createHash('sha256');
			hashSum.update(content);
			const hex = hashSum.digest('hex');
			const key = `${root.join('/')}/${file}`;
			console.log(hex, key);
			if (config[key] !== hex) {
				needUpdate = true;
				cp.execSync(`code -r -w -d ${targetFile} ${filePath}`);
				await updateConfig(key);
			}
		} else if (fileStat.isDirectory()) {
			await patch([...root, file]);
		}
	}
}

async function getConfig() {
	const config = await fsPromise.readFile(path.join(__dirname, '.patch')).catch(() => '{}');
	return JSON.parse(config);
}

async function saveConfig() {
	await fsPromise.writeFile(path.join(__dirname, '.patch'), JSON.stringify(config, null, 2));
}

async function updateConfig(file) {
	const content = await fsPromise.readFile(path.join(SRC_TARGET, file));
	const hashSum = crypto.createHash('sha256');
	hashSum.update(content);
	const hex = hashSum.digest('hex');
	config[file] = hex;
}

const main = async () => {
	config = await getConfig();
	await patch();
	needUpdate && (await saveConfig());
};

main();
