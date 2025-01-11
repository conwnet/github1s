/**
 * @file GitHub1s Commit Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { CommitTreeItem, getCommitTreeItemDescription } from '@/views/commit-list';
import { commitTreeDataProvider, fileHistoryTreeDataProvider } from '@/views';
import { adapterManager } from '@/adapters';
import { Repository } from '@/repository';

export const checkCommitExists = async (repo: string, commitSha: string) => {
	const adapter = adapterManager.getCurrentAdapter();
	const dataSoruce = await adapter.resolveDataSource();
	try {
		return !!(await dataSoruce.provideCommit(repo, commitSha));
	} catch (error) {
		const errorMessage =
			(error as any)?.response?.status === 404
				? `No commit found for commitSha: ${commitSha}`
				: error?.response?.data?.message;
		vscode.window.showErrorMessage(errorMessage || `Get commit ${commitSha}} error`);
		return false;
	}
};

const commandSwitchToCommit = async (commitItemOrSha?: string | CommitTreeItem) => {
	let commitSha: string | undefined = commitItemOrSha
		? typeof commitItemOrSha === 'string'
			? commitItemOrSha
			: commitItemOrSha.commit.sha
		: '';
	const adapter = adapterManager.getCurrentAdapter();
	const { repo } = await router.getState();
	const repository = Repository.getInstance(adapter.scheme, repo);

	// if the a commitSha isn't provided, use quickInput
	if (!commitSha) {
		// manual input a commit sha
		const inputCommitShaItem: vscode.QuickPickItem = {
			label: '$(git-commit) Manual input the commit sha',
			alwaysShow: true,
		};
		// use the commit list as the candidates
		const commits = await repository.getCommitList();
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
			quickPick.onDidAccept(() => resolve(quickPick.activeItems[0])),
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

// this command is used in `source control commit list view`
const commandOpenCommitOnOfficialPage = async (commitItemOrSha?: string | CommitTreeItem) => {
	const commitSha = commitItemOrSha
		? typeof commitItemOrSha === 'string'
			? commitItemOrSha
			: commitItemOrSha.commit.sha
		: '';
	if (commitSha) {
		const { repo } = await router.getState();
		const routerParser = await router.resolveParser();
		const commitPath = await routerParser.buildCommitPath(repo, commitSha);
		const commitLink = await routerParser.buildExternalLink(commitPath);
		return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(commitLink));
	}
};

const commandRefreshCommitList = (forceUpdate = true) => {
	return commitTreeDataProvider.updateTree(forceUpdate);
};

const commandLoadMoreCommits = async () => {
	return commitTreeDataProvider.loadMoreCommits();
};

const commandLoadMoreCommitChangedFiles = async (commitSha: string) => {
	return commitTreeDataProvider.loadMoreChangedFiles(commitSha);
};

const commandRefreshFileHistoryCommitList = (forceUpdate = true) => {
	return fileHistoryTreeDataProvider.updateTree(forceUpdate);
};

const commandLoadMoreFileHistoryCommits = async () => {
	return fileHistoryTreeDataProvider.loadMoreCommits();
};

const commandLoadMoreFileHistoryCommitChangedFiles = async (commitSha: string) => {
	return fileHistoryTreeDataProvider.loadMoreChangedFiles(commitSha);
};

export const registerCommitCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.refreshCommitList', commandRefreshCommitList),
		vscode.commands.registerCommand('github1s.commands.searchCommit', commandSwitchToCommit),
		vscode.commands.registerCommand('github1s.commands.switchToCommit', commandSwitchToCommit),
		vscode.commands.registerCommand('github1s.commands.openCommitOnGitHub', commandOpenCommitOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCommitOnGitLab', commandOpenCommitOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCommitOnBitbucket', commandOpenCommitOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCommitOnOfficialPage', commandOpenCommitOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.loadMoreCommits', commandLoadMoreCommits),
		vscode.commands.registerCommand('github1s.commands.loadMoreCommitChangedFiles', commandLoadMoreCommitChangedFiles),
		vscode.commands.registerCommand('github1s.commands.loadMoreFileHistoryCommits', commandLoadMoreFileHistoryCommits),
		vscode.commands.registerCommand(
			'github1s.commands.loadMoreFileHistoryCommitChangedFiles',
			commandLoadMoreFileHistoryCommitChangedFiles,
		),
		vscode.commands.registerCommand(
			'github1s.commands.refreshFileHistoryCommitList',
			commandRefreshFileHistoryCommitList,
		),
	);
};
