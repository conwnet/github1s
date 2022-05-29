const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const generate = require('generate-file-webpack-plugin');
const fs = require('fs-extra');

const APP_ROOT = path.join(__dirname, '.');

const devVscode = !!process.env.DEV_VSCODE;

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

const VSCODE_NODE_MODULES = [
	'@vscode/iconv-lite-umd',
	'@vscode/vscode-languagedetection',
	'jschardet',
	'tas-client-umd',
	'vscode-oniguruma',
	'vscode-textmate',
	'xterm',
	'xterm-addon-search',
	'xterm-addon-unicode11',
	'xterm-addon-webgl',
]
	.map((x) => `vscode-web/node_modules/${x}/**`)
	.map((from) => ({
		from,
		globOptions: {
			dot: true,
			// ignore: ["**/node_modules/**/node_modules/**"]
		},
		to({ context, absoluteFilename }) {
			const relativePath = path.relative(context, absoluteFilename);
			const relativeDir = path.dirname(relativePath.replace('vscode-web/node_modules/', ''));
			return `static/node_modules/${relativeDir}/[name][ext]`;
		},
	}));

module.exports = {
	mode: 'development',
	entry: './resources/manifest.json',
	plugins: [
		new CopyPlugin({
			patterns: [
				{ from: 'resources/favicon*', to: '[name][ext]' },
				{ from: 'resources/manifest.json', to: '[name][ext]' },
				{ from: 'resources/robots.txt', to: '[name][ext]' },
				{
					from: devVscode ? 'resources/index-dev-vscode.html' : 'resources/index.html',
					to: 'index[ext]',
				},
				{
					from: 'node_modules/@github1s/vscode-web/dist/extensions/**',
					to({ context, absoluteFilename }) {
						const relativePath = path.relative(context, absoluteFilename);
						const relativeDir = path.dirname(
							relativePath.replace('node_modules/@github1s/vscode-web/dist/extensions/', '')
						);
						return `static/extensions/${relativeDir}/[name][ext]`;
					},
				},
				!devVscode && {
					from: 'node_modules/@github1s/vscode-web/dist/vscode/',
					to({ context, absoluteFilename }) {
						const relativePath = path.relative(context, absoluteFilename);
						const relativeDir = path.dirname(
							relativePath.replace('node_modules/@github1s/vscode-web/dist/vscode/', '')
						);
						return `static/vscode/${relativeDir}/[name][ext]`;
					},
				},
				{
					from: 'extensions/**/*',
					to: 'static',
					globOptions: {
						dot: true,
						ignore: ['**/node_modules/**'],
					},
				},
				{
					from: 'resources/{initialize.js,github.svg,gitlab.svg,bitbucket.svg,npm.svg}',
					to: 'static/config/[name][ext]',
				},
				...VSCODE_NODE_MODULES,
			].filter(Boolean),
		}),
		generate({
			file: 'static/config/extensions.js',
			content: () => {
				const vscodeExtensions = devVscode ? scanVSCodeExtensions() : [];
				const extensions = [...vscodeExtensions, ...scanGitHub1sExtensions()];
				return `window.github1sExtensions = ${JSON.stringify(extensions)};`;
			},
		}),
	],
	devServer: {
		static: {
			directory: path.join(__dirname, 'dist'),
		},
		allowedHosts: 'all',
		client: {
			progress: true,
		},
		historyApiFallback: {
			rewrites: [{ from: /./, to: '/index.html' }],
		},
		proxy: {
			'/api/vscode-unpkg': {
				target: 'http://localhost:5001',
			},
		},
		port: 5000,
	},
};
