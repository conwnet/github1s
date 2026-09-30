#!/usr/bin/env node

import { spawn } from 'child_process';
import { loadEnvLocal } from './load-env-local.js';

loadEnvLocal();

const [, , ...args] = process.argv;
if (!args.length) {
	console.error('Usage: node scripts/run-with-env.js <command> [args...]');
	process.exit(1);
}

const child = spawn(args[0], args.slice(1), {
	stdio: 'inherit',
	shell: true,
	env: process.env,
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 1);
});
