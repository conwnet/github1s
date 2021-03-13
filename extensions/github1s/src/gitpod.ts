/**
 * @file Show Gitpod In Status Bar
 * @author mikenikles
 */

import * as vscode from 'vscode';
import router from '@/router';

const getGitpodRepoUri = async () => {
	const { owner, repo } = await router.getState();
	return vscode.Uri.parse(
		`https://gitpod.io/#https://github.com/${owner}/${repo}`
	);
};

export const showGitpod = async () => {
	const gitpodRepoUri = await getGitpodRepoUri();

	const item = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		0
	);
	item.text = '  $(pencil) Develop your project on Gitpod';
	item.tooltip = 'Edit files, open/review PRs, use Docker - all online.';
	item.command = {
		title: `Open Gitpod`,
		command: 'vscode.open',
		arguments: [gitpodRepoUri],
	};
	item.show();
};
