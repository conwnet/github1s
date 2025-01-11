/**
 * @file GitHub1s adapter
 * @author netcon
 */

import * as vscode from 'vscode';
import { setVSCodeContext } from '@/helpers/vscode';
import { GitHub1sDataSource } from './data-source';
import { GitHub1sRouterParser } from './router-parser';
import { GitHub1sSettingsViewProvider } from './settings';
import { GitHub1sAuthenticationView } from './authentication';
import { Adapter, CodeReviewType, PlatformName } from '../types';
import { SourcegraphDataSource } from '../sourcegraph/data-source';
import { getCurrentRepo } from './parse-path';

export class GitHub1sAdapter implements Adapter {
	public scheme: string = 'github1s';
	public platformName = PlatformName.GitHub;
	public codeReviewType = CodeReviewType.PullRequest;

	resolveDataSource() {
		return Promise.resolve(GitHub1sDataSource.getInstance());
	}

	resolveRouterParser() {
		return Promise.resolve(GitHub1sRouterParser.getInstance());
	}

	activateAsDefault() {
		// register settings view and show it in activity bar
		setVSCodeContext('github1s:views:settings:visible', true);
		setVSCodeContext('github1s:views:codeReviewList:visible', true);
		setVSCodeContext('github1s:views:commitList:visible', true);
		setVSCodeContext('github1s:views:fileHistory:visible', true);
		setVSCodeContext('github1s:features:gutterBlame:enabled', true);

		vscode.window.registerWebviewViewProvider(
			GitHub1sSettingsViewProvider.viewType,
			new GitHub1sSettingsViewProvider(),
		);
		vscode.commands.registerCommand('github1s.commands.openGitHub1sAuthPage', () => {
			return GitHub1sAuthenticationView.getInstance().open();
		});
		vscode.commands.registerCommand('github1s.commands.syncSourcegraphRepository', async () => {
			const dataSource = SourcegraphDataSource.getInstance('github');
			const randomRef = (Math.random() + 1).toString(36).slice(2);
			return dataSource.provideCommit(await getCurrentRepo(), randomRef).then(() => {
				return vscode.commands.executeCommand('workbench.action.reloadWindow');
			});
		});
	}

	deactivateAsDefault() {
		setVSCodeContext('github1s:views:settings:visible', false);
		setVSCodeContext('github1s:views:codeReviewList:visible', false);
		setVSCodeContext('github1s:views:commitList:visible', false);
		setVSCodeContext('github1s:views:fileHistory:visible', false);
		setVSCodeContext('github1s:features:gutterBlame:enabled', false);
	}
}
