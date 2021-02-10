#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const APP_ROOT = path.join(__dirname, '../..');
const VSCODE_PATH = path.join(APP_ROOT, 'lib/vscode');
const enableExtensions = require(path.join(APP_ROOT, 'resources/builtin-extensions.json'));

/**
 * Loosely based on `getExtensionKind` from `src/vs/workbench/services/extensions/common/extensionsUtil.ts`
 */
const isWebExtension = (manifest) => {
	if (manifest && typeof manifest.extensionKind !== 'undefined') {
		const extensionKind = Array.isArray(manifest.extensionKind) ? manifest.extensionKind : [manifest.extensionKind];
		return (extensionKind.indexOf('web') >= 0);
	}
	return (!Boolean(manifest.main) || Boolean(manifest.browser));
};

const getExtensionData = (absolutePath) => {
	try {
		const packageJSONPath = path.join(absolutePath, 'package.json');
		if (!fs.existsSync(packageJSONPath)) {
			return null;
		}
		const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath).toString('utf8'));
		if (!isWebExtension(packageJSON)) {
			return null;
		}
		const children = fs.readdirSync(absolutePath);
		const packageNLSPath = children.filter(child => child === 'package.nls.json')[0];
		const packageNLS = packageNLSPath ? JSON.parse(fs.readFileSync(path.join(absolutePath, packageNLSPath)).toString()) : undefined;
		const readme = children.filter(child => /^readme(\.txt|\.md|)$/i.test(child))[0];
		const changelog = children.filter(child => /^changelog(\.txt|\.md|)$/i.test(child))[0];
		const extensionFolder = path.basename(absolutePath);

		return {
			extensionPath: extensionFolder,
			packageJSON,
			packageNLS,
			readmePath: readme ? path.join(extensionFolder, readme) : undefined,
			changelogPath: changelog ? path.join(extensionFolder, changelog) : undefined,
		};
	} catch {
		return null;
	}
};

const scanBuiltinExtensions = () => {
	return enableExtensions.map(item => getExtensionData(path.join(VSCODE_PATH, item.path))).filter(Boolean);
};

const scanGithub1sExtensions = () => {
	const extensions = fs.readdirSync(path.join(APP_ROOT, 'extensions'));
	return extensions.map(item => getExtensionData(path.join(APP_ROOT, 'extensions', item))).filter(Boolean);
};

const main = () => {
	const CONFIGURE_PATH = path.join(APP_ROOT, 'dist/static/configure');
	const extensions = [...scanBuiltinExtensions(), ...scanGithub1sExtensions()];

	fs.ensureDirSync(CONFIGURE_PATH);
	fs.writeFileSync(path.join(CONFIGURE_PATH, 'extensions.json'), JSON.stringify(extensions));
};

main();
