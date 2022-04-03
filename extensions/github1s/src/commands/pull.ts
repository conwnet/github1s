/**
 * @file GitHub1s Pull Request Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import repository from '@/repository';
import { PullTreeItem, getPullTreeItemLabel, getPullTreeItemDescription } from '@/views/code-review-list-view';
import { pullRequestTreeDataProvider } from '@/views';
import { RequestNotFoundError } from '@/helpers/fetch';

const checkPullExists = async (pullNumber: number) => {
	try {
		return !!(await repository.getPullManager().getItem(pullNumber));
	} catch (e) {
		vscode.window.showErrorMessage(
			e instanceof RequestNotFoundError ? `No pull request found for number: ${pullNumber}` : e.message
		);
		return false;
	}
};

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
		const pullRequestItems: vscode.QuickPickItem[] = (await repository.getPullManager().getList()).map((pull) => ({
			pullNumber: pull.number,
			label: getPullTreeItemLabel(pull),
			description: getPullTreeItemDescription(pull),
		}));

		const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
		quickPick.matchOnDescription = true;
		quickPick.items = [inputPullNumberItem, ...pullRequestItems];
		quickPick.show();

		const choice = (await new Promise<vscode.QuickPickItem | undefined>((resolve) =>
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

	(await checkPullExists(pullNumber)) && router.replace(`/${owner}/${repo}/pull/${pullNumber}`);
};

// this command is used in `source control pull request view`
export const commandPullViewItemSwitchToPull = (viewItem: PullTreeItem) => {
	return commandSwitchToPull(viewItem?.pull?.number);
};

// this command is used in `source control pull request view`
export const commandPullViewItemOpenOnGitHub = async (viewItem: PullTreeItem) => {
	const pullNumber = viewItem?.pull?.number;

	if (pullNumber) {
		const { owner, repo } = await router.getState();
		return vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse(`https://github.com/${owner}/${repo}/pull/${pullNumber}`)
		);
	}
};

export const commandPullViewRefreshPullList = (forceUpdate = true) => {
	return pullRequestTreeDataProvider.updateTree(forceUpdate);
};

export const commandPullViewLoadMorePulls = () => {
	repository.getPullManager().loadMore();
	return commandPullViewRefreshPullList(false);
};
