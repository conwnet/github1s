#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');

const VSCODE_WEB_ROOT = path.join(__dirname, '..');
const VSCODE_ROOT = path.join(VSCODE_WEB_ROOT, 'lib/vscode');

const getWebPackagePaths = () => {
	const webPkgPath = path.join(VSCODE_ROOT, 'remote/web/package.json');
	return Object.keys(require(webPkgPath).dependencies).filter((pkg) => {
		return !['@microsoft/1ds-core-js', '@microsoft/1ds-post-js'].includes(pkg);
	});
};

const main = () => {
	const webPkgPaths = getWebPackagePaths();
	const webPkgsRoot = path.join(VSCODE_WEB_ROOT, 'dist/web-packages');
	fs.ensureDirSync(webPkgsRoot);
	webPkgPaths.forEach((pkg) => {
		const src = path.join(VSCODE_ROOT, 'node_modules', pkg);
		const dest = path.join(webPkgsRoot, pkg);
		fs.copySync(src, dest);
	});
	console.log(`Copied ${webPkgPaths.length} web packages done!`);
};

main();
