/**
 * @file github1s commands
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import router from '@/router';
import repository from '@/repository';
import { validateToken } from '@/interfaces/github-api-rest';

export const commandValidateToken = (silent: boolean = false) => {
	const context = getExtensionContext();
	const oAuthToken =
		(context.globalState.get('github-oauth-token') as string) || '';
	return validateToken(oAuthToken).then((tokenStatus) => {
		if (!silent) {
			const remaining = tokenStatus.remaining;
			if (!oAuthToken) {
				if (remaining > 0) {
					vscode.window.showWarningMessage(
						`You haven\'t set a GitHub OAuth Token yet, and you can have ${remaining} requests in the current rate limit window.`
					);
				} else {
					vscode.window.showWarningMessage(
						"You haven't set a GitHub OAuth Token yet, and the rate limit is exceeded."
					);
				}
			} else if (!tokenStatus.valid) {
				vscode.window.showErrorMessage(
					'Current GitHub OAuth Token is invalid.'
				);
			} else if (tokenStatus.valid && tokenStatus.remaining > 0) {
				vscode.window.showInformationMessage(
					`Current GitHub OAuth Token is OK, and you can have ${remaining} requests in the current rate limit window.`
				);
			} else if (tokenStatus.valid && tokenStatus.remaining <= 0) {
				vscode.window.showWarningMessage(
					'Current GitHub OAuth Token is Valid, but the rate limit is exceeded.'
				);
			}
		}
		return tokenStatus;
	});
};

export const commandUpdateToken = (silent: boolean = false) => {
	return vscode.window
		.showInputBox({
			placeHolder: 'Please input the GitHub OAuth Token',
		})
		.then((token) => {
			if (!token) {
				return;
			}
			return getExtensionContext()!
				.globalState.update('github-oauth-token', token || '')
				.then(() => {
					// we don't need wait validate, so we don't `return`
					validateToken(token).then((tokenStatus) => {
						if (!silent) {
							if (!tokenStatus.valid) {
								vscode.window.showErrorMessage(
									'GitHub OAuth Token have updated, but it is invalid.'
								);
							} else if (tokenStatus.remaining <= 0) {
								vscode.window.showWarningMessage(
									'GitHub OAuth Token have updated, but the rate limit is exceeded.'
								);
							} else {
								vscode.window.showInformationMessage(
									'GitHub OAuth Token have updated.'
								);
							}
						}
						tokenStatus.valid &&
							tokenStatus.remaining > 0 &&
							vscode.commands.executeCommand(
								'workbench.files.action.refreshFilesExplorer'
							);
					});
				});
		});
};

export const commandClearToken = (silent: boolean = false) => {
	return vscode.window
		.showWarningMessage(
			'Would you want to clear the saved GitHub OAuth Token?',
			{ modal: true },
			'Confirm'
		)
		.then((choose) => {
			if (choose === 'Confirm') {
				return getExtensionContext()!
					.globalState.update('github-oauth-token', '')
					.then(() => {
						!silent &&
							vscode.window.showInformationMessage(
								'You have cleared the saved GitHb OAuth Token.'
							);
					})
					.then(() => true);
			}
			return false;
		});
};

export const commandGetCurrentAuthority = () => router.getAuthority();

export const commandCheckoutRef = async () => {
	const [branchRefs, tagRefs] = await Promise.all([
		repository.getBranches(),
		repository.getTags(),
	]);
	const branchPickerItems: vscode.QuickPickItem[] = branchRefs.map(
		(branchRef) => ({
			label: branchRef.name,
			description: (branchRef.object?.sha || '').slice(0, 8),
		})
	);
	const tagPickerItems: vscode.QuickPickItem[] = tagRefs.map((tagRef) => ({
		label: tagRef.name,
		description: `Tag at ${(tagRef.object?.sha || '').slice(0, 8)}`,
	}));

	const quickPick = vscode.window.createQuickPick();
	const routerState = await router.getState();
	quickPick.placeholder = routerState.ref;
	quickPick.items = [...branchPickerItems, ...tagPickerItems];

	quickPick.show();
	const choice = await new Promise<vscode.QuickPickItem | undefined>(
		(resolve) => quickPick.onDidAccept(() => resolve(quickPick.activeItems[0]))
	);
	quickPick.hide();

	const targetRef = choice?.label || quickPick.value;
	if (targetRef.toUpperCase() === 'HEAD') {
		router.replace(`/${routerState.owner}/${routerState.repo}`);
		return;
	}
	router.replace(`/${routerState.owner}/${routerState.repo}/tree/${targetRef}`);
};

export const commandOpenGitpod = () => {
	return router.getAuthority().then((currentAuthority) => {
		const [currentOwner, currentRepo] = currentAuthority.split('+');
		vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse(
				`https://gitpod.io/#https://github.com/${currentOwner}/${currentRepo}`
			)
		);
	});
};
