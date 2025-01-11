import path from 'path';
import fs from 'fs-extra';

export const PROJECT_ROOT = path.join(import.meta.dirname, '..');

export const getAllFiles = (directory) => {
	return fs.readdirSync(directory).flatMap((name) => {
		const filePath = path.join(directory, name);
		const isDirectory = fs.statSync(filePath).isDirectory();
		return isDirectory ? getAllFiles(filePath) : filePath;
	});
};

export const patchSourceFile = (sourceFile) => {
	const baseFile = path.relative(PROJECT_ROOT, path.resolve(sourceFile));
	const vscodeFile = path.join(PROJECT_ROOT, 'lib/vscode', baseFile);
	fs.writeFileSync(vscodeFile, fs.readFileSync(sourceFile));
};
