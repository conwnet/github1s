/**
 * @file vscode messages
 */

import * as vscode from 'vscode';

export const showSourcegraphSearchMessage = (() => {
	let alreadyShown = false;

	return () => {
		if (alreadyShown) {
			return;
		}
		alreadyShown = true;
		vscode.window.showInformationMessage(
			'The code search ability is powered by [Sourcegraph](https://sourcegraph.com)'
		);
	};
})();

export const showFileBlameAuthorizedRequiredMessage = async () => {
	const selectedValue = await vscode.window.showInformationMessage(
		'The file blame feature only works for authorized users due to the limit of [GitHub GraphQL API](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql), please provide an OAuth Token to enable it.',
		'Ignore',
		'Set OAuth Token'
	);
	if (selectedValue === 'Set OAuth Token') {
		vscode.commands.executeCommand('github1s.views.settings.focus');
	}
};
