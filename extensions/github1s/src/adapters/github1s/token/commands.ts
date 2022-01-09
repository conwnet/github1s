/**
 * @file GitHub1s Token Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext, getOAuthToken } from '@/helpers/context';
import { validateToken } from '@/interfaces/github-api-rest';
import { GITHUB_OAUTH_TOKEN } from '@/helpers/constants';

export const commandValidateToken = (token: string, silent: boolean = false) => {
	// if we can not get a token from arguments,
	// just verify current token which has been saved
	const oAuthToken = token || getOAuthToken();
	return validateToken(oAuthToken).then((tokenStatus) => {
		if (!silent) {
			const remaining = tokenStatus.remaining;
			if (!oAuthToken) {
				if (remaining > 0) {
					vscode.window.showWarningMessage(
						`You haven\'t set a GitHub OAuth Token yet, and you can have ${remaining} requests in the current rate limit window.`
					);
				} else {
					vscode.window.showWarningMessage("You haven't set a GitHub OAuth Token yet, and the rate limit is exceeded.");
				}
			} else if (!tokenStatus.valid) {
				vscode.window.showErrorMessage('Current GitHub OAuth Token is invalid.');
			} else if (tokenStatus.valid && tokenStatus.remaining > 0) {
				vscode.window.showInformationMessage(
					`Current GitHub OAuth Token is OK, and you can have ${remaining} requests in the current rate limit window.`
				);
			} else if (tokenStatus.valid && tokenStatus.remaining <= 0) {
				vscode.window.showWarningMessage('Current GitHub OAuth Token is Valid, but the rate limit is exceeded.');
			}
		}
		return tokenStatus;
	});
};

export const commandUpdateToken = async (token: string, silent: boolean = false) => {
	if (!token) {
		// if the token isn't passed by arguments,
		// open an input box and request user input it
		token = await vscode.window.showInputBox({
			placeHolder: 'Please input the GitHub OAuth Token',
		});
	}

	if (!token) {
		return;
	}

	await getExtensionContext()!.globalState.update(GITHUB_OAUTH_TOKEN, token || '');
	vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');

	if (silent) {
		return;
	}

	// we don't need wait validate, so we don't `return`
	validateToken(token).then((tokenStatus) => {
		if (!tokenStatus.valid) {
			vscode.window.showErrorMessage('GitHub OAuth Token have updated, but it is invalid.');
		} else if (tokenStatus.remaining <= 0) {
			vscode.window.showWarningMessage('GitHub OAuth Token have updated, but the rate limit is exceeded.');
		} else {
			vscode.window.showInformationMessage('GitHub OAuth Token have updated.');
		}
	});
};

export const commandClearToken = (silent: boolean = false) => {
	return vscode.window
		.showWarningMessage('Would you want to clear the saved GitHub OAuth Token?', { modal: true }, 'Confirm')
		.then((choose) => {
			if (choose === 'Confirm') {
				return getExtensionContext()!
					.globalState.update(GITHUB_OAUTH_TOKEN, '')
					.then(() => {
						!silent && vscode.window.showInformationMessage('You have cleared the saved GitHb OAuth Token.');
					})
					.then(() => true);
			}
			return false;
		});
};

type AuthMessageData =
	| { access_token: string; token_type: string; scope: string }
	| { error: string; error_description: string; error_uri?: string };

export const commandAuthorizingGithub = async (silent: boolean = false): Promise<string | void> => {
	// vscode-web-github1s/src/vs/github1s/authorizing-github.ts
	// retry with authorizing overlay if browser blocked opening authorizing window
	const data: AuthMessageData = await vscode.commands.executeCommand('github1s.vscode.get-github-access-token', true);

	if ('access_token' in data) {
		// update the access_token into extension context
		await commandUpdateToken(data.access_token);
		return data.access_token;
	}

	if ('error' in data && !silent) {
		const seeMoreLinkText = data.error_uri ? ` [See more](data.error_uri)` : '';
		vscode.window.showErrorMessage(`${data.error_description}${seeMoreLinkText}`);
	}
	return '';
};

// open the overlay on the page, and get the access_token from it
export const commandAuthorizingGithubWithOverlay = async () => {
	const data: AuthMessageData = await vscode.commands.executeCommand(
		'github1s.vscode.get-github-access-token-with-overlay'
	);

	if ('access_token' in data) {
		await commandUpdateToken(data.access_token);
		return data.access_token;
	}
	return '';
};
