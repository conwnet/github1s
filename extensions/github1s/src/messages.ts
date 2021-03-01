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
			'The code search ability is powered by Sourcegraph (https://sourcegraph.com)'
		);
	};
})();
