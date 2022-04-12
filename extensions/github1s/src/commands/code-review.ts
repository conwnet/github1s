/**
 * @file GitHub1s Code Review Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import {
	CodeReviewTreeItem,
	getCodeReviewTreeItemLabel,
	getCodeReviewTreeItemDescription,
} from '@/views/code-review-list-view';
import { codeReviewRequestTreeDataProvider } from '@/views';
import { CodeReviewType } from '@/adapters/types';
import { adapterManager } from '@/adapters';
import { Repository } from '@/repository';

const CodeReviewTypeName = {
	[CodeReviewType.PullRequest]: 'pull request',
	[CodeReviewType.MergeRequest]: 'merge request',
	[CodeReviewType.ChangeRequest]: 'change request',
};

const checkCodeReviewExists = async (repo: string, codeReviewId: string) => {
	const adapter = adapterManager.getCurrentAdapter();
	const dataSoruce = await adapter.resolveDataSource();
	try {
		return !!(await dataSoruce.provideCodeReview(repo, codeReviewId));
	} catch (error) {
		const typeName = CodeReviewTypeName[adapter.codeReviewType];
		const errorMessage =
			(error as any)?.response?.status === 404
				? `No ${typeName} found for id: ${codeReviewId}`
				: error?.response?.data?.message;
		vscode.window.showErrorMessage(errorMessage || `Get ${typeName} ${codeReviewId} error`);
		return false;
	}
};

const commandSwitchToCodeReview = async (codeReviewItemOrId?: string | CodeReviewTreeItem) => {
	let codeReviewId: string | undefined = codeReviewItemOrId
		? typeof codeReviewItemOrId === 'string'
			? codeReviewItemOrId
			: codeReviewItemOrId.codeReview.id
		: '';
	const adapter = adapterManager.getCurrentAdapter();
	const { repo } = await router.getState();
	const typeName = CodeReviewTypeName[adapter.codeReviewType];
	const repository = Repository.getInstance(adapter.scheme, repo);

	// if the a codeReviewId isn't provided, use quickInput
	if (!codeReviewId) {
		// manual input a codeReviewId
		const inputCodeReviewIdItem: vscode.QuickPickItem = {
			label: `$(git-pull-request) Manual input the ${typeName} id`,
			alwaysShow: true,
		};
		// use the code review list as the candidates
		const codeReviews = await repository.getCodeReviewList();
		const codeReviewItems: vscode.QuickPickItem[] = codeReviews.map((codeReview) => ({
			codeReviewId: codeReview.id,
			label: getCodeReviewTreeItemLabel(codeReview),
			description: getCodeReviewTreeItemDescription(codeReview),
		}));

		const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
		quickPick.matchOnDescription = true;
		quickPick.items = [inputCodeReviewIdItem, ...codeReviewItems];
		quickPick.show();

		const choice = (await new Promise<vscode.QuickPickItem | undefined>((resolve) =>
			quickPick.onDidAccept(() => resolve(quickPick.activeItems[0]))
		)) as vscode.QuickPickItem & { codeReviewId?: string };
		quickPick.hide();

		// select nothing
		if (!choice) {
			return;
		}

		// select `manual input the code review id`
		if (choice === inputCodeReviewIdItem) {
			codeReviewId = await vscode.window.showInputBox({
				placeHolder: `Please input the ${typeName} id`,
			});
		} else {
			// select a code review item
			codeReviewId = choice.codeReviewId;
		}
	}

	const routerParser = await router.resolveParser();
	(await checkCodeReviewExists(repo, codeReviewId!)) &&
		router.replace(await routerParser.buildCodeReviewPath(repo, codeReviewId!));
};

// this command is used in `source control code review view`
const commandOpenCodeReviewOnOfficialPage = async (codeReviewItemOrId?: string | CodeReviewTreeItem) => {
	const codeReviewId: string | undefined = codeReviewItemOrId
		? typeof codeReviewItemOrId === 'string'
			? codeReviewItemOrId
			: codeReviewItemOrId.codeReview.id
		: '';
	if (codeReviewId) {
		const { repo } = await router.getState();
		const routerParser = await router.resolveParser();
		const codeReviewPath = await routerParser.buildCodeReviewPath(repo, codeReviewId);
		const codeReviewLink = await routerParser.buildExternalLink(codeReviewPath);
		return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(codeReviewLink));
	}
};

const commandRefreshCodeReviewList = (forceUpdate = true) => {
	return codeReviewRequestTreeDataProvider.updateTree(forceUpdate);
};

const commandLoadMoreCodeReviews = async () => {
	return codeReviewRequestTreeDataProvider.loadMoreCodeReviews();
};

const commandLoadMoreCodeReviewChangedFiles = async (codeReviewId: string) => {
	return codeReviewRequestTreeDataProvider.loadMoreChangedFiles(codeReviewId);
};

export const registerCodeReviewCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.refreshCodeReviewList', commandRefreshCodeReviewList),
		vscode.commands.registerCommand('github1s.commands.searchCodeReview', commandSwitchToCodeReview),
		vscode.commands.registerCommand('github1s.commands.switchToPullRequest', commandSwitchToCodeReview),
		vscode.commands.registerCommand('github1s.commands.switchToMergeRequest', commandSwitchToCodeReview),
		vscode.commands.registerCommand('github1s.commands.switchToChangeRequest', commandSwitchToCodeReview),
		vscode.commands.registerCommand('github1s.commands.switchToCodeReview', commandSwitchToCodeReview),
		vscode.commands.registerCommand('github1s.commands.openCodeReviewOnGitHub', commandOpenCodeReviewOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCodeReviewOnGitLab', commandOpenCodeReviewOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCodeReviewOnBitbucket', commandOpenCodeReviewOnOfficialPage),
		vscode.commands.registerCommand(
			'github1s.commands.openCodeReviewOnOfficialPage',
			commandOpenCodeReviewOnOfficialPage
		),
		vscode.commands.registerCommand('github1s.commands.load-more-code-reviews', commandLoadMoreCodeReviews),
		vscode.commands.registerCommand(
			'github1s.commands.load-more-code-review-changed-files',
			commandLoadMoreCodeReviewChangedFiles
		)
	);
};
