/**
 * @file git submodule util
 * @author netcon
 */

import { FileSystemError, Uri } from 'vscode';

// the code below is come from https://github.com/microsoft/vscode/blob/1.52.1/extensions/git/src/git.ts#L661
export interface Submodule {
	name: string;
	path: string;
	url: string;
}

// the code below is come from https://github.com/microsoft/vscode/blob/1.52.1/extensions/git/src/git.ts#L667
export function parseGitmodules(raw: string): Submodule[] {
	const regex = /\r?\n/g;
	let position = 0;
	let match: RegExpExecArray | null = null;

	const result: Submodule[] = [];
	let submodule: Partial<Submodule> = {};

	function parseLine(line: string): void {
		const sectionMatch = /^\s*\[submodule "([^"]+)"\]\s*$/.exec(line);

		if (sectionMatch) {
			if (submodule.name && submodule.path && submodule.url) {
				result.push(submodule as Submodule);
			}

			const name = sectionMatch[1];

			if (name) {
				submodule = { name };
				return;
			}
		}

		if (!submodule) {
			return;
		}

		const propertyMatch = /^\s*(\w+)\s*=\s*(.*)$/.exec(line);

		if (!propertyMatch) {
			return;
		}

		const [, key, value] = propertyMatch;

		switch (key) {
			case 'path':
				submodule.path = value;
				break;
			case 'url':
				submodule.url = value;
				break;
		}
	}

	while ((match = regex.exec(raw))) {
		parseLine(raw.substring(position, match.index));
		position = match.index + match[0].length;
	}

	parseLine(raw.substring(position));

	if (submodule.name && submodule.path && submodule.url) {
		result.push(submodule as Submodule);
	}

	return result;
}

export const parseSubmoduleUrl = (url: string) => {
	try {
		let host = '';
		let path = '';
		// the url is looks like git@github.com:xcv58/rc_config_files.git
		if (url.startsWith('git@')) {
			const colonIndex = url.indexOf(':');
			host = url.slice(0, colonIndex);
			path = url.slice(colonIndex + 1);
		} else {
			const submoduleUri = Uri.parse(url);
			host = submoduleUri.authority;
			path = submoduleUri.path;
		}
		let submoduleScheme = 'github1s';
		if (/\bgithub\.com/i.test(host)) {
			submoduleScheme = 'github1s';
		} else if (/\bgitlab\.com/i.test(host)) {
			submoduleScheme = 'gitlab1s';
		} else if (/\bbitbucket\.org/i.test(host)) {
			submoduleScheme = 'bitbucket1s';
		} else {
			throw FileSystemError.Unavailable('only github submodules are supported now');
		}
		const [submoduleOwner, submoduleRepoPart] = path.split('/').filter(Boolean);
		// if there are a repo which the name endsWith '.git' (likes conwnet/demo.git), this ambiguity may cause a problem
		const submoduleRepo = submoduleRepoPart.endsWith('.git') ? submoduleRepoPart.slice(0, -4) : submoduleRepoPart;
		return [submoduleScheme, `${submoduleOwner}/${submoduleRepo}`];
	} catch (e) {
		throw FileSystemError.Unavailable('Can not found valid submodule declare');
	}
};
