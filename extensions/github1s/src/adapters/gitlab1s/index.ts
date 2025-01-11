/**
 * @file GitLab1s adapter
 * @author netcon
 */

import * as vscode from 'vscode';
import { GitLab1sRouterParser } from './router-parser';
import { GitLab1sDataSource } from './data-source';
import { SourcegraphDataSource } from '../sourcegraph/data-source';
import { Adapter, CodeReviewType, PlatformName } from '../types';
import { GitLab1sSettingsViewProvider } from './settings';
import { GitLab1sAuthenticationView } from './authentication';
import { setVSCodeContext } from '@/helpers/vscode';
import { getCurrentRepo } from './parse-path';

export class GitLab1sAdapter implements Adapter {
	public scheme: string = 'gitlab1s';
	public platformName = PlatformName.GitLab;
	public codeReviewType = CodeReviewType.MergeRequest;

	resolveDataSource() {
		return Promise.resolve(GitLab1sDataSource.getInstance());
	}

	resolveRouterParser() {
		return Promise.resolve(GitLab1sRouterParser.getInstance());
	}

	activateAsDefault() {
		// register settings view and show it in activity bar
		setVSCodeContext('github1s:views:settings:visible', true);
		setVSCodeContext('github1s:views:codeReviewList:visible', true);
		setVSCodeContext('github1s:views:commitList:visible', true);
		setVSCodeContext('github1s:views:fileHistory:visible', true);
		setVSCodeContext('github1s:features:gutterBlame:enabled', true);

		vscode.window.registerWebviewViewProvider(
			GitLab1sSettingsViewProvider.viewType,
			new GitLab1sSettingsViewProvider(),
		);
		vscode.commands.registerCommand('github1s.commands.openGitLab1sAuthPage', () => {
			return GitLab1sAuthenticationView.getInstance().open();
		});
		vscode.commands.registerCommand('github1s.commands.syncSourcegraphRepository', async () => {
			const dataSource = SourcegraphDataSource.getInstance('gitlab');
			const randomRef = (Math.random() + 1).toString(36).slice(2);
			return dataSource.provideCommit(await getCurrentRepo(), randomRef);
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
