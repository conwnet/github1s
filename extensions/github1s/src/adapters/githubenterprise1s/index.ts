/**
 * @file GitHub1s adapter
 * @author netcon
 * @updated by kcoms555 for Enterprise
 */

import * as vscode from 'vscode';
import { setVSCodeContext } from '@/helpers/vscode';
import { GitHubEnterprise1sDataSource } from './data-source';
import { GitHubEnterprise1sRouterParser } from './router-parser';
import { GitHubEnterprise1sSettingsViewProvider } from './settings';
import { GitHubEnterprise1sAuthenticationView } from './authentication';
import { Adapter, CodeReviewType, PlatformName } from '../types';

export class GitHubEnterprise1sAdapter implements Adapter {
	public scheme: string = 'githubenterprise1s';
	public platformName = PlatformName.GitHubEnterprise;
	public codeReviewType = CodeReviewType.PullRequest;

	resolveDataSource() {
		return Promise.resolve(GitHubEnterprise1sDataSource.getInstance());
	}

	resolveRouterParser() {
		return Promise.resolve(GitHubEnterprise1sRouterParser.getInstance());
	}

	activateAsDefault() {
		// register settings view and show it in activity bar
		setVSCodeContext('github1s:views:settings:visible', true);
		setVSCodeContext('github1s:views:codeReviewList:visible', true);
		setVSCodeContext('github1s:views:commitList:visible', true);
		setVSCodeContext('github1s:views:fileHistory:visible', true);
		setVSCodeContext('github1s:features:gutterBlame:enabled', true);

		vscode.window.registerWebviewViewProvider(
			GitHubEnterprise1sSettingsViewProvider.viewType,
			new GitHubEnterprise1sSettingsViewProvider()
		);
		vscode.commands.registerCommand('github1s.commands.openGitHubEnterprise1sAuthPage', () => {
			return GitHubEnterprise1sAuthenticationView.getInstance().open();
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
