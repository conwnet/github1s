import path from 'path';
import fs from 'fs-extra';
import cp from 'child_process';

export const PROJECT_ROOT = path.join(import.meta.dirname, '..');

export const executeCommand = (command, args, cwd) => {
	const result = cp.spawnSync(command, args, { stdio: 'inherit', cwd });
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
	}
};

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
