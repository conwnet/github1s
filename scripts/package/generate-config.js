#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

const APP_ROOT = path.join(__dirname, '../..');

// vscode-web/lib/vscode/build/lib/extensions.ts
const isWebExtension = (manifest) => {
	if (Boolean(manifest.browser)) {
		return true;
	}
	if (Boolean(manifest.main)) {
		return false;
	}
	// neither browser nor main
	if (typeof manifest.extensionKind !== 'undefined') {
		const extensionKind = Array.isArray(manifest.extensionKind) ? manifest.extensionKind : [manifest.extensionKind];
		if (extensionKind.indexOf('web') >= 0) {
			return true;
		}
	}
	if (typeof manifest.contributes !== 'undefined') {
		for (const id of ['debuggers', 'terminal', 'typescriptServerPlugins']) {
			if (manifest.contributes.hasOwnProperty(id)) {
				return false;
			}
		}
	}
	return true;
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
		const packageNLSPath = children.filter((child) => child === 'package.nls.json')[0];
		const packageNLS = packageNLSPath
			? JSON.parse(fs.readFileSync(path.join(absolutePath, packageNLSPath)).toString())
			: undefined;
		const readme = children.filter((child) => /^readme(\.txt|\.md|)$/i.test(child))[0];
		const changelog = children.filter((child) => /^changelog(\.txt|\.md|)$/i.test(child))[0];
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

const scanVSCodeExtensions = () => {
	const extensionsPath = path.join(APP_ROOT, 'node_modules/@github1s/vscode-web/dist/extensions');
	const extensionFolders = fs.existsSync(extensionsPath) ? fs.readdirSync(extensionsPath) : [];

	return extensionFolders.map((item) => getExtensionData(path.join(extensionsPath, item))).filter(Boolean);
};

const scanGitHub1sExtensions = () => {
	const extensions = fs.readdirSync(path.join(APP_ROOT, 'extensions'));
	return extensions.map((item) => getExtensionData(path.join(APP_ROOT, 'extensions', item))).filter(Boolean);
};

const main = () => {
	const CONFIG_PATH = path.join(APP_ROOT, 'dist/static/config');
	const vscodeExtensions = process.env.DEV_VSCODE ? scanVSCodeExtensions() : [];
	const extensions = [...vscodeExtensions, ...scanGitHub1sExtensions()];

	fs.ensureDirSync(CONFIG_PATH);
	fs.writeFileSync(
		path.join(CONFIG_PATH, 'extensions.js'),
		`window.github1sExtensions = ${JSON.stringify(extensions)};`
	);
	fs.copyFileSync(path.join(APP_ROOT, 'resources/initialize.js'), path.join(CONFIG_PATH, 'initialize.js'));
	fs.copyFileSync(path.join(APP_ROOT, 'resources/github.svg'), path.join(CONFIG_PATH, 'github.svg'));
	fs.copyFileSync(path.join(APP_ROOT, 'resources/gitlab.svg'), path.join(CONFIG_PATH, 'gitlab.svg'));
	fs.copyFileSync(path.join(APP_ROOT, 'resources/bitbucket.svg'), path.join(CONFIG_PATH, 'bitbucket.svg'));
};

main();
