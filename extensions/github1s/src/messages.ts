/**
 * @file vscode messages
 */

import * as vscode from 'vscode';
import { getSourcegraphUrl } from '@/helpers/urls';

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
