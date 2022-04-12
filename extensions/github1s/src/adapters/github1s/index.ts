/**
 * @file GitHub1s adapter
 * @author netcon
 */

import * as vscode from 'vscode';
import { setVSCodeContext } from '@/helpers/vscode';
import { DataSource, RouterParser, Adapter, Promisable, CodeReviewType, PlatformName } from '../types';
import { GitHub1sDataSource } from './data-source';
import { GitHub1sRouterParser } from './router-parser';
import { GitHubTokenManager } from './token';
import { GitHub1sAuthenticationView } from './authentication';
import { GitHub1sSettingsViewProvider } from './settings';

export class GitHub1sAdapter implements Adapter {
	public scheme: string = 'github1s';
	public platformName: PlatformName = PlatformName.GitHub;
	public codeReviewType: CodeReviewType = CodeReviewType.PullRequest;

	constructor() {
		GitHubTokenManager.getInstance();
	}

	resolveDataSource(): Promisable<DataSource> {
		return Promise.resolve(GitHub1sDataSource.getInstance());
	}

	resolveRouterParser(): Promisable<RouterParser> {
		return Promise.resolve(GitHub1sRouterParser.getInstance());
	}

	registerAsDefault(): Promisable<void> {
		// register settings view and show it in activity bar
		setVSCodeContext('github1s:views:settings:visible', true);
		setVSCodeContext('github1s:views:codeReviewList:visible', true);
		setVSCodeContext('github1s:views:commitList:visible', true);

		vscode.window.registerWebviewViewProvider(
			GitHub1sSettingsViewProvider.viewType,
			new GitHub1sSettingsViewProvider()
		);
		vscode.commands.registerCommand('github1s.openAuthenticationPage', () => {
			GitHub1sAuthenticationView.getInstance().open();
		});
	}
}
