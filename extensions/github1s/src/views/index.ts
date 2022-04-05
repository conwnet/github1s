/**
 * @file register views
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { CodeReviewTreeDataProvider } from './code-review-list-view';
import { CommitTreeDataProvider } from './commit-list-view';
import { platformAdapterManager } from '@/adapters';
import { CodeReviewType } from '@/adapters/types';

export const commitTreeDataProvider = new CommitTreeDataProvider();
export const codeReviewRequestTreeDataProvider = new CodeReviewTreeDataProvider();

export const codeReviewViewTitle = {
	[CodeReviewType.PullRequest]: 'Pull Requests',
	[CodeReviewType.MergeRequest]: 'Merge Requests',
	[CodeReviewType.ChangeRequest]: 'Change Requests',
};

export const registerCustomViews = () => {
	const context = getExtensionContext();

	// register code review view which is in source control panel
	const treeView = vscode.window.createTreeView(CodeReviewTreeDataProvider.viewType, {
		treeDataProvider: codeReviewRequestTreeDataProvider,
	});
	// set code view list view title according code review type
	treeView.title = codeReviewViewTitle[platformAdapterManager.getCurrentAdapter().codeReviewType];

	context.subscriptions.push(
		// register commit view which is in source control panel
		vscode.window.registerTreeDataProvider(CommitTreeDataProvider.viewType, commitTreeDataProvider)
	);
};
