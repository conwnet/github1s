#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { PROJECT_ROOT } from '../utils.js';

const deepMerge = (target, source) => {
	for (const key of Object.keys(source)) {
		if (typeof source[key] === 'object' && target[key]) {
			deepMerge(target[key], source[key]);
		} else {
			target[key] = source[key];
		}
	}
	return target;
};

const main = () => {
	const oputBuildPath = path.join(PROJECT_ROOT, 'lib/vscode/out-build');
	const nlsKeys = JSON.parse(fs.readFileSync(path.join(oputBuildPath, 'nls.keys.json')));
	const nlsMessages = JSON.parse(fs.readFileSync(path.join(oputBuildPath, 'nls.messages.json')));

	const languageContentsMap = {};
	const i18nPath = path.join(PROJECT_ROOT, 'lib/vscode-loc/i18n');

	for (const languageDir of fs.readdirSync(i18nPath)) {
		const languagePath = path.join(i18nPath, languageDir);
		const packageJson = JSON.parse(fs.readFileSync(path.join(languagePath, 'package.json')));

		for (const localization of packageJson.contributes.localizations) {
			if (!languageContentsMap[localization.languageId]) {
				languageContentsMap[localization.languageId] = {};
			}

			const contents = languageContentsMap[localization.languageId];
			for (const translation of localization.translations) {
				const translationPath = path.join(languagePath, translation.path);
				deepMerge(contents, JSON.parse(fs.readFileSync(translationPath)).contents);
			}
		}
	}

	for (const languageId of Object.keys(languageContentsMap)) {
		const langMessages = [];
		const contents = languageContentsMap[languageId];

		for (const [file, keys] of nlsKeys) {
			for (const key of keys) {
				langMessages.push(contents[file]?.[key] ?? nlsMessages[langMessages.length]);
			}
		}
		if (langMessages.length !== nlsMessages.length) {
			throw new Error(`Invalid nls messages for ${languageId}`);
		}

		const nslDirPath = path.join(PROJECT_ROOT, `dist/nls/${languageId}`);
		fs.ensureDirSync(nslDirPath);
		fs.writeFileSync(
			path.join(nslDirPath, 'nls.messages.js'),
			`globalThis._VSCODE_NLS_MESSAGES=${JSON.stringify(langMessages)};` +
				`globalThis._VSCODE_NLS_LANGUAGE=${JSON.stringify(languageId)};`,
		);
	}
};

main();
