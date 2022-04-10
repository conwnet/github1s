/**
 * @file GitHub1s Commit Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
// import repository from '@/repository';
import { CommitTreeItem, getCommitTreeItemDescription } from '@/views/commit-list-view';
import { commitTreeDataProvider } from '@/views';
import { adapterManager } from '@/adapters';
import { RequestNotFoundError } from '@/helpers/fetch';
import { CommitManager } from '@/views/commit-manager';

const checkCommitExists = async (repo: string, commitSha: string) => {
	const adapter = adapterManager.getCurrentAdapter();
	const dataSoruce = await adapter.resolveDataSource();
	try {
		return !!(await dataSoruce.provideCommit(repo, commitSha));
	} catch (e) {
		vscode.window.showErrorMessage(
			e instanceof RequestNotFoundError ? `No commit found for CommitID: ${commitSha}` : e.messaged
		);
		return false;
	}
};

export const commandSwitchToCommit = async (commitSha?: string) => {
	const adapter = adapterManager.getCurrentAdapter();
	const { repo } = await router.getState();
	const commitManager = CommitManager.getInstance(adapter.scheme, repo)!;

	// if the a commitSha isn't provided, use quickInput
	if (!commitSha) {
		// manual input a commit sha
		const inputCommitShaItem: vscode.QuickPickItem = {
			label: '$(git-commit) Manual input the commit sha',
			alwaysShow: true,
		};
		// use the commit list as the candidates
		const commits = await commitManager.getList();
		const commitItems: vscode.QuickPickItem[] = commits.map((commit) => ({
			commitSha: commit.sha,
			label: commit.message,
			description: getCommitTreeItemDescription(commit),
		}));

		const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
		quickPick.matchOnDescription = true;
		quickPick.items = [inputCommitShaItem, ...commitItems];
		quickPick.show();

		const choice = (await new Promise<vscode.QuickPickItem | undefined>((resolve) =>
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

	const routerParser = await router.resolveParser();
	if (await checkCommitExists(repo, commitSha!)) {
		router.replace(await routerParser.buildCommitPath(repo, commitSha!));
	}
};

// this command is used in `source control commits view`
export const commandCommitViewItemSwitchToCommit = (viewItem: CommitTreeItem) => {
	return commandSwitchToCommit(viewItem?.commit?.sha);
};

// this command is used in `source control commit list view`
export const commandCommitViewItemOpenOnOfficialPage = async (viewItem: CommitTreeItem) => {
	const commitSha = viewItem?.commit?.sha;
	if (commitSha) {
		const { repo } = await router.getState();
		const routerParser = await router.resolveParser();
		const commitPath = await routerParser.buildCommitPath(repo, commitSha);
		const commitLink = await routerParser.buildExternalLink(commitPath);
		return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(commitLink));
	}
};

export const commandCommitViewRefreshCommitList = (forceUpdate = true) => {
	return commitTreeDataProvider.updateTree(forceUpdate);
};

export const commandCommitViewLoadMoreCommits = async () => {
	return commitTreeDataProvider.loadMoreCommits();
};

export const commandCommitViewLoadMoreChangedFiles = async (commitSha: string) => {
	return commitTreeDataProvider.loadMoreChangedFiles(commitSha);
};
