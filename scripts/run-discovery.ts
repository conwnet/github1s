#!/usr/bin/env node

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { generateDiscovery } from '../workers/discovery/src/generate.ts';

// Preview the same collection logic without writing to Workers KV.
const main = async () => {
	if (process.argv.length > 2) {
		throw new Error('This preview takes no arguments; edit workers/discovery/src/collections.ts.');
	}
	const snapshot = await generateDiscovery({
		token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
		onProgress: console.error,
	});
	const output = resolve('out/discovery/github/latest.json');
	const temporary = `${output}.${process.pid}.tmp`;
	await mkdir(dirname(output), { recursive: true });
	try {
		await writeFile(temporary, `${JSON.stringify(snapshot)}\n`);
		await rename(temporary, output);
	} finally {
		await rm(temporary, { force: true });
	}
	console.log(`Previewed ${snapshot.collections.length} collections at ${output}`);
};

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
