import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(projectRoot, '.env.local');

export const loadEnvLocal = () => {
	if (!fs.existsSync(envPath)) {
		return;
	}

	for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}
		const separatorIndex = trimmed.indexOf('=');
		if (separatorIndex < 0) {
			continue;
		}
		let key = trimmed.slice(0, separatorIndex).trim();
		if (key.startsWith('export ')) {
			key = key.slice('export '.length).trim();
		}
		if (!key) {
			continue;
		}
		let value = trimmed.slice(separatorIndex + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		process.env[key] = value;
	}
};
