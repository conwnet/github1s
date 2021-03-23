/**
 * @file GitHub1s Pull Request Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import repository from '@/repository';
import { PullTreeItem } from '@/views/pull-list-view';

export const commandSwitchToPull = async (pullNumber?: number) => {
	const { owner, repo } = await router.getState();

	// if the a pull number isn't provided, use quickInput
	if (!pullNumber) {
		// manual input a pull number
		const inputPullNumberItem: vscode.QuickPickItem = {
			label: '$(git-pull-request) Manual input the pull number',
			alwaysShow: true,
		};
		// use the pull list as the candidates
		const pullRequestItems: vscode.QuickPickItem[] = (
			await repository.getPulls()
		).map((pull) => ({
			pullNumber: pull.number,
			label: `#${pull.number} ${pull.title}`,
		}));

		const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
		quickPick.items = [inputPullNumberItem, ...pullRequestItems];
		quickPick.show();

		const choice = (await new Promise<vscode.QuickPickItem | undefined>(
			(resolve) =>
				quickPick.onDidAccept(() => resolve(quickPick.activeItems[0]))
		)) as vscode.QuickPickItem & { pullNumber?: number };
		quickPick.hide();

		// select nothing
		if (!choice) {
			return;
		}

		// select `manual input the pull number`
		if (choice === inputPullNumberItem) {
			pullNumber = parseInt(
				await vscode.window.showInputBox({
					placeHolder: 'Please input the pull number',
				}),
				10
			);
		} else {
			// select a pull item
			pullNumber = choice.pullNumber;
		}
	}

	pullNumber && router.replace(`/${owner}/${repo}/pull/${pullNumber}`);
};

// this command is used in `source control pull request view`
export const commandViewItemSwitchToPull = (viewItem: PullTreeItem) => {
	return commandSwitchToPull(viewItem?.pull?.number);
};

// this command is used in `source control pull request view`
export const commandViewItemOpenPullOnGitHub = async (
	viewItem: PullTreeItem
) => {
	const pullNumber = viewItem?.pull?.number;

	if (pullNumber) {
		const { owner, repo } = await router.getState();
		return vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse(`https://github.com/${owner}/${repo}/pull/${pullNumber}`)
		);
	}
};
