/**
 * @file vscode messages
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getSourcegraphUrl } from '@/helpers/urls';

export const showSourcegraphSearchMessage = (() => {
	let alreadyShown = false;

	return async () => {
		if (alreadyShown) {
			return;
		}
		alreadyShown = true;
		const { repo, ref } = await router.getState();
		const url = `https://sourcegraph.com/github.com/${repo}@${ref}`;
		vscode.window.showInformationMessage(`The code search ability is powered by [Sourcegraph](${url})`);
	};
})();

export const showSourcegraphSymbolMessage = (() => {
	let alreadyShown = false;
	return async (repo: string, ref: string, path: string, line: number, character: number) => {
		if (alreadyShown) {
			return;
		}
		alreadyShown = true;
		const url = getSourcegraphUrl(repo, ref, path, line, character);
		vscode.window.showInformationMessage(`The results are provided by [Sourcegraph](${url})`);
	};
})();

export const showFileBlameAuthorizedRequiredMessage = async () => {
	const selectedValue = await vscode.window.showInformationMessage(
		'The file blame feature only works for authorized users due to the limit of [GitHub GraphQL API](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql), please provide an AccessToken to enable it.',
		'Set AccessToken',
	);
	if (selectedValue === 'Set AccessToken') {
		vscode.commands.executeCommand('github1s.views.settings.focus');
	}
};
