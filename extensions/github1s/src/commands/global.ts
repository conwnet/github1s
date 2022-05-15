/**
 * @file GitHub1s Ref Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';

export const commandOpenOnOfficialPage = async () => {
	const location = (await router.getHistory()).location;
	const routerParser = await router.resolveParser();
	const fullPath = `${location.pathname}${location.search}${location.hash}`;
	const externalLink = await routerParser.buildExternalLink(fullPath);

	return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(externalLink));
};

export const commandOpenGitpod = () => {
	return router.getAuthority().then((currentAuthority) => {
		const [currentRepo] = currentAuthority.split('+');
		vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse(`https://gitpod.io/#https://github.com/${currentRepo}`)
		);
	});
};

export const registerGlobalCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.openOnGitHub', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnGitLab', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnBitbucket', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnOfficialPage', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnGitPod', commandOpenGitpod)
	);
};
