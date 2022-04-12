/**
 * @file github1s commands
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import {
	commandValidateToken,
	commandUpdateToken,
	commandClearToken,
	commandAuthorizingGithub,
	commandAuthorizingGithubWithOverlay,
} from './token';
import { registerRefCommands } from './ref';
import { registerCodeReviewCommands } from './code-review';
import { registerCommitCommands } from './commit';
import { commandOpenGitpod } from './gitpod';
import { registerEditorCommands } from './editor';
import { registerBlameCommands } from './blame';
import { commandOpenOnGitHub } from './global';

const commands: { id: string; callback: (...args: any[]) => any }[] = [
	// validate GitHub OAuth Token
	{ id: 'github1s.validate-token', callback: commandValidateToken },
	// update GitHub OAuth Token
	{ id: 'github1s.update-token', callback: commandUpdateToken },
	// clear GitHub OAuth Token
	{ id: 'github1s.clear-token', callback: commandClearToken },
	// authorizing github with `Web application flow`
	{ id: 'github1s.authorizing-github', callback: commandAuthorizingGithub },
	// open the overlay on the page and authorizing github with `Web application flow`
	{ id: 'github1s.authorizing-github-with-overlay', callback: commandAuthorizingGithubWithOverlay }, // prettier-ignore

	// open current repository on gitpod
	{ id: 'github1s.open-gitpod', callback: commandOpenGitpod },

	// open current page on GitHub
	{ id: 'github1s.openOnGitHub', callback: commandOpenOnGitHub },
];

export const registerGitHub1sCommands = () => {
	const context = getExtensionContext();

	registerRefCommands(context);
	registerEditorCommands(context);
	registerCodeReviewCommands(context);
	registerCommitCommands(context);
	registerBlameCommands(context);

	context.subscriptions.push(
		...commands.map((command) => vscode.commands.registerCommand(command.id, command.callback))
	);

	vscode.commands.registerCommand('github1s.dev-test', () => {
		console.log(vscode.window.activeTextEditor);
	});
};
