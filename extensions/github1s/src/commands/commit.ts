/**
 * @file GitHub1s Commit Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import repository from '@/repository';
import { CommitTreeItem } from '@/views/commit-list-view';

export const commandSwitchToCommit = async (commitSha?: string) => {
	const { owner, repo } = await router.getState();

	// if the a commitSha isn't provided, use quickInput
	if (!commitSha) {
		// manual input a commit sha
		const inputCommitShaItem: vscode.QuickPickItem = {
			label: '$(git-commit) Manual input the commit sha',
			alwaysShow: true,
		};
		// use the commit list as the candidates
		const commitItems: vscode.QuickPickItem[] = (
			await repository.getCommits((await router.getState()).ref)
		).map((commit) => ({
			commitSha: commit.sha,
			label: `(${commit.sha.slice(0, 7)}) ${commit.commit.message}`,
		}));

		const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
		quickPick.items = [inputCommitShaItem, ...commitItems];
		quickPick.show();

		const choice = (await new Promise<vscode.QuickPickItem | undefined>(
			(resolve) =>
				quickPick.onDidAccept(() => resolve(quickPick.activeItems[0]))
		)) as vscode.QuickPickItem & { commitSha?: string };
		quickPick.hide();

		// select nothing
		if (!choice) {
			return;
		}

		// select `manual input the commit sha`
		if (choice === inputCommitShaItem) {
			commitSha = await vscode.window.showInputBox({
				placeHolder: 'Please input the commit sha',
			});
		} else {
			// select a commit sha
			commitSha = choice.commitSha;
		}
	}

	commitSha && router.replace(`/${owner}/${repo}/commit/${commitSha}`);
};

// this command is used in `source control commits view`
export const commandCommitViewItemSwitchToCommit = (
	viewItem: CommitTreeItem
) => {
	return commandSwitchToCommit(viewItem?.commit?.sha);
};

// this command is used in `source control commit list view`
export const commandCommitViewItemOpenOnGitHub = async (
	viewItem: CommitTreeItem
) => {
	const commitSha = viewItem?.commit?.sha;

	if (commitSha) {
		const { owner, repo } = await router.getState();
		return vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse(
				`https://github.com/${owner}/${repo}/commit/${commitSha}`
			)
		);
	}
};
