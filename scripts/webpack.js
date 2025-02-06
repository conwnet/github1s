import path from 'path';
import fs from 'fs-extra';
import { globSync } from 'glob';

const APP_ROOT = path.join(import.meta.dirname, '..');

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
	const extensionsPath = path.join(APP_ROOT, 'vscode-web/lib/vscode/extensions');
	const extensionFolders = fs.existsSync(extensionsPath) ? fs.readdirSync(extensionsPath) : [];
	return extensionFolders.map((item) => getExtensionData(path.join(extensionsPath, item))).filter(Boolean);
};

const scanGitHub1sExtensions = () => {
	const extensions = fs.readdirSync(path.join(APP_ROOT, 'extensions'));
	return extensions.map((item) => getExtensionData(path.join(APP_ROOT, 'extensions', item))).filter(Boolean);
};

export const getBuiltinExtensions = (devVscode) => {
	return [...(devVscode ? scanVSCodeExtensions() : []), ...scanGitHub1sExtensions()];
};

const createImportMapScript = () => {
	const cssFiles = globSync('**/*.css', { cwd: path.join(APP_ROOT, 'vscode-web/lib/vscode/out') });
	return `const styleElement = document.createElement('style');
			styleElement.setAttribute('type', 'text/css');
			styleElement.setAttribute('media', 'screen');
			document.head.appendChild(styleElement);

			globalThis._VSCODE_CSS_MODULES = ${JSON.stringify(cssFiles || [])};
			globalThis._VSCODE_CSS_LOAD = (url) => styleElement.sheet.insertRule(\`@import url(\${url});\`);

			const importMap = { imports: {} };
			for (const cssModule of globalThis._VSCODE_CSS_MODULES) {
				const cssUrl = new URL(cssModule, globalThis._VSCODE_FILE_ROOT).href;
				const jsSrc = \`globalThis._VSCODE_CSS_LOAD('\${cssUrl}');\\n\`;
				const blob = new Blob([jsSrc], { type: 'application/javascript' });
				importMap.imports[cssUrl] = URL.createObjectURL(blob);
			}
			const importMapElement = document.createElement('script');
			importMapElement.type = 'importmap';
			importMapElement.setAttribute('nonce', '1nline-m4p');
			importMapElement.textContent = JSON.stringify(importMap, undefined, 2);
			document.head.appendChild(importMapElement);`;
};

export const createGlobalScript = (staticDir, devVscode) => {
	return `globalThis.dynamicImport = (url) => import(url);
			globalThis._VSCODE_FILE_ROOT = new URL('/${staticDir}/vscode/', window.location.origin).toString();
			${devVscode ? createImportMapScript() : ''}`;
};
