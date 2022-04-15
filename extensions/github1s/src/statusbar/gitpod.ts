/**
 * @file Show Gitpod In Status Bar
 * @author mikenikles
 */

import * as vscode from 'vscode';
import router from '@/router';
import { PlatformName } from '../adapters/types';
import { adapterManager } from '../adapters';

const getGitpodRepoUri = async () => {
	const { repo } = await router.getState();
	return vscode.Uri.parse(`https://gitpod.io/#https://github.com/${repo}`);
};

export const showGitpod = async () => {
	if (adapterManager.getCurrentAdapter().platformName !== PlatformName.GitHub) {
		return;
	}

	const gitpodRepoUri = await getGitpodRepoUri();
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);

	item.text = '  $(pencil) Develop your project on Gitpod';
	item.tooltip = 'Edit files, open/review PRs, use Docker - all online.';
	item.command = {
		title: `Open Gitpod`,
		command: 'vscode.open',
		arguments: [gitpodRepoUri],
	};
	item.show();
};
