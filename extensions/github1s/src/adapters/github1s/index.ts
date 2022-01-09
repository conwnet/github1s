/**
 * @file GitHub1s adapter
 * @author netcon
 */

import * as vscode from 'vscode';
import { setVSCodeContext } from '@/helpers/vscode';
import { DataSource, RouterParser, PlatformAdapter, Promisable } from '../types';
import { GitHub1sDataSource } from './data-source';
import { GitHub1sRouterParser } from './router-parser';
import { GitHubTokenManager } from './token/manager';
import { GitHub1sSettingsViewProvider } from './token/settings-view';

export class GitHub1sPlatformAdapter implements PlatformAdapter {
	public scheme: string = 'github1s';
	public name: string = 'GitHub';

	constructor() {
		GitHubTokenManager.getInstance();

		// register settings view and show it in activity bar
		vscode.window.registerWebviewViewProvider(
			GitHub1sSettingsViewProvider.viewType,
			new GitHub1sSettingsViewProvider()
		);
		setVSCodeContext('github1s:views:github1s-settings:visible', true);
	}

	resolveDataSource(): Promisable<DataSource> {
		return Promise.resolve(GitHub1sDataSource.getInstance());
	}

	resolveRouterParser(): Promisable<RouterParser> {
		return Promise.resolve(GitHub1sRouterParser.getInstance());
	}
}
