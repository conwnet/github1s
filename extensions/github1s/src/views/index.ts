/**
 * @file register views
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { SettingsView } from './settings-view';
import { PullRequestTreeDataProvider } from './code-review-list-view';
import { CommitTreeDataProvider } from './commit-list-view';

export const commitTreeDataProvider = new CommitTreeDataProvider();
export const pullRequestTreeDataProvider = new PullRequestTreeDataProvider();

export const registerCustomViews = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		// register settings view
		// vscode.window.registerWebviewViewProvider(SettingsView.viewType, new SettingsView()),

		// register pull request view which is in source control panel
		vscode.window.registerTreeDataProvider(PullRequestTreeDataProvider.viewType, pullRequestTreeDataProvider),

		// register commit view which is in source control panel
		vscode.window.registerTreeDataProvider(CommitTreeDataProvider.viewType, commitTreeDataProvider)
	);
};
