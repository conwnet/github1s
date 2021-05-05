/**
 * @file GitHub1s Ref Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';

export const commandOpenOnGitHub = async () => {
	const location = router.history.location;
	const githubPath =
		location.pathname === '/'
			? '/conwnet/github1s'
			: `${location.pathname}${location.search}${location.hash}`;
	const GITHUB_ORIGIN = 'https://github.com';
	const gitHubUri = vscode.Uri.parse(GITHUB_ORIGIN + githubPath);

	return vscode.commands.executeCommand('vscode.open', gitHubUri);
};
