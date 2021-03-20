/**
 * @file register views
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { SettingsView } from './settings-view';
import { PullRequestTreeDataProvider } from './pull-list-view';

export const registerCustomViews = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		// register settings view
		vscode.window.registerWebviewViewProvider(
			SettingsView.viewType,
			new SettingsView()
		),

		// register pull request view which is in source control panel
		vscode.window.registerTreeDataProvider(
			PullRequestTreeDataProvider.viewType,
			new PullRequestTreeDataProvider()
		)
	);
};
