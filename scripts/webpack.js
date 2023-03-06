const Url = require('url');
const path = require('path');
const fs = require('fs-extra');

const APP_ROOT = path.join(__dirname, '..');

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

const createExtensionsContent = (devVscode) => {
	const vscodeExtensions = devVscode ? scanVSCodeExtensions() : [];
	const extensions = [...vscodeExtensions, ...scanGitHub1sExtensions()];
	return `window.github1sExtensions = ${JSON.stringify(extensions)};`;
};

const createVSCodeUnpkgProxy = () => ({
	changeOrigin: true,
	target: 'vscode-unpkg.net',
	pathRewrite: (path) => path.replace(/^\/api\/vscode-unpkg\//, '/'),
	router: (req) => {
		const PATH_REGEXP = /^\/api\/vscode-unpkg\/([^/]+)\/(.*)/;
		const matches = Url.parse(req.url).pathname.match(PATH_REGEXP);
		return `https://${matches?.[1]}.vscode-unpkg.net`.toLowerCase();
	},
});

module.exports = {
	createVSCodeUnpkgProxy,
	createExtensionsContent,
};
