/**
 * @file register views
 */

import * as vscode from 'vscode';
import { adapterManager } from '@/adapters';
import { CodeReviewType } from '@/adapters/types';
import { getExtensionContext } from '@/helpers/context';
import { CodeReviewTreeDataProvider } from './code-review-list';
import { CommitTreeDataProvider, FileHistoryTreeDataProvider } from './commit-list';

export const fileHistoryTreeDataProvider = new FileHistoryTreeDataProvider();
export const commitTreeDataProvider = new CommitTreeDataProvider();
export const codeReviewRequestTreeDataProvider = new CodeReviewTreeDataProvider();

export const codeReviewViewTitle = {
	[CodeReviewType.PullRequest]: 'Pull Requests',
	[CodeReviewType.MergeRequest]: 'Merge Requests',
	[CodeReviewType.ChangeRequest]: 'Change Requests',
	[CodeReviewType.CodeReview]: 'Code Reviews',
};

export const registerCustomViews = () => {
	const context = getExtensionContext();

	// register code review view which is in source control panel
	const codeReviewTreeView = vscode.window.createTreeView(CodeReviewTreeDataProvider.viewType, {
		treeDataProvider: codeReviewRequestTreeDataProvider,
	});
	// set code view list view title according code review type
	const codeReviewType = adapterManager.getCurrentAdapter().codeReviewType || CodeReviewType.CodeReview;
	codeReviewTreeView.title = codeReviewViewTitle[codeReviewType];

	context.subscriptions.push(
		// register commit view which is in source control panel
		vscode.window.registerTreeDataProvider(FileHistoryTreeDataProvider.viewType, fileHistoryTreeDataProvider),
		vscode.window.registerTreeDataProvider(CommitTreeDataProvider.viewType, commitTreeDataProvider),
	);
};
