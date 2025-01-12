import path from 'path';
import cp from 'child_process';

export const PROJECT_ROOT = path.join(import.meta.dirname, '..');

export const executeCommand = (command, args, cwd) => {
	const result = cp.spawnSync(command, args, { stdio: 'inherit', cwd });
	if (result.error) {
		throw result.error;
	}
};
