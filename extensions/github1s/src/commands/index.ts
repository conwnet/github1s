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
} from './token';
import { commandGetCurrentAuthority, commandCheckoutRef } from './ref';
import { commandSwitchToPull } from './pull';
import { commandOpenGitpod } from './gitpod';

export const registerGitHub1sCommands = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		// validate GitHub OAuth Token
		vscode.commands.registerCommand(
			'github1s.validate-token',
			commandValidateToken
		),
		// update GitHub OAuth Token
		vscode.commands.registerCommand(
			'github1s.update-token',
			commandUpdateToken
		),
		// clear GitHub OAuth Token
		vscode.commands.registerCommand('github1s.clear-token', commandClearToken),

		// get current authority (`${owner}+${repo}+${ref}`)
		vscode.commands.registerCommand(
			'github1s.get-current-authority',
			commandGetCurrentAuthority
		),

		// checkout to other branch/tag/commit
		vscode.commands.registerCommand(
			'github1s.checkout-ref',
			commandCheckoutRef
		),

		// switch to a pull request
		vscode.commands.registerCommand(
			'github1s.switch-to-pull',
			commandSwitchToPull
		),

		// open current repository on gitpod
		vscode.commands.registerCommand('github1s.open-gitpod', commandOpenGitpod)
	);
};
