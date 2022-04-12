/**
 * @file GitHub1s GitPod Related Commands
 * @author mikenikles
 */

import * as vscode from 'vscode';
import router from '@/router';

export const commandOpenGitpod = () => {
	return router.getAuthority().then((currentAuthority) => {
		const [currentRepo] = currentAuthority.split('+');
		vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse(`https://gitpod.io/#https://github.com/${currentRepo}`)
		);
	});
};
