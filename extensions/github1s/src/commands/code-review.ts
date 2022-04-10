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
import { RequestNotFoundError } from '@/helpers/fetch';
import { CodeReviewType } from '@/adapters/types';
import { platformAdapterManager } from '@/adapters';
import { CodeReviewManager } from '@/views/code-review-manager';

const CodeReviewTypeName = {
	[CodeReviewType.PullRequest]: 'pull request',
	[CodeReviewType.MergeRequest]: 'merge request',
	[CodeReviewType.ChangeRequest]: 'change request',
};

const checkCodeReviewExists = async (repo: string, codeReviewId: string) => {
	const adapter = platformAdapterManager.getCurrentAdapter();
	const dataSoruce = await adapter.resolveDataSource();
	try {
		return !!(await dataSoruce.provideCodeReview(repo, codeReviewId));
	} catch (e) {
		const typeName = CodeReviewTypeName[adapter.codeReviewType];
		vscode.window.showErrorMessage(
			e instanceof RequestNotFoundError ? `No ${typeName} found for id: ${codeReviewId}` : e.message
		);
		return false;
	}
};

export const commandSwitchToCodeReview = async (codeReviewId?: string) => {
	const adapter = platformAdapterManager.getCurrentAdapter();
	const { repo } = await router.getState();
	const typeName = CodeReviewTypeName[adapter.codeReviewType];
	const codeReviewManager = CodeReviewManager.getInstance(adapter.scheme, repo)!;

	// if the a codeReviewId isn't provided, use quickInput
	if (!codeReviewId) {
		// manual input a codeReviewId
		const inputCodeReviewIdItem: vscode.QuickPickItem = {
			label: `$(git-pull-request) Manual input the ${typeName} id`,
			alwaysShow: true,
		};
		// use the code review list as the candidates
		const codeReviews = await codeReviewManager.getList();
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
export const commandCodeReviewViewItemSwitchToCodeReview = (viewItem: CodeReviewTreeItem) => {
	return commandSwitchToCodeReview(viewItem?.codeReview?.id);
};

// this command is used in `source control code review view`
export const commandCodeReviewViewItemOpenOnOfficialPage = async (viewItem: CodeReviewTreeItem) => {
	const codeReviewId = viewItem?.codeReview?.id;

	if (codeReviewId) {
		const { repo } = await router.getState();
		const routerParser = await router.resolveParser();
		const codeReviewPath = await routerParser.buildCodeReviewPath(repo, codeReviewId);
		const codeReviewLink = await routerParser.buildExternalLink(codeReviewPath);
		return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(codeReviewLink));
	}
};

export const commandCodeReviewViewRefreshCodeReviewList = (forceUpdate = true) => {
	return codeReviewRequestTreeDataProvider.updateTree(forceUpdate);
};

export const commandCodeReviewViewLoadMoreCodeReviews = async () => {
	return codeReviewRequestTreeDataProvider.loadMoreCodeReviews();
};

export const commandCodeReviewViewLoadMoreChangedFiles = async (codeReviewId: string) => {
	return codeReviewRequestTreeDataProvider.loadMoreChangedFiles(codeReviewId);
};
