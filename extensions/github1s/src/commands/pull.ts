/**
 * @file GitHub1s Pull Request Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';

export const commandSwitchToPull = async (pullNumber?: number) => {
	const { owner, repo } = await router.getState();

	// if the a pull number isn't provided, use quickInput
	if (!pullNumber) {
		pullNumber = parseInt(
			await vscode.window.showInputBox({
				placeHolder: 'Please input the pull number',
			}),
			10
		);
	}

	pullNumber && router.replace(`/${owner}/${repo}/pull/${pullNumber}`);
};
