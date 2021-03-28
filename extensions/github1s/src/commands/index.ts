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
import {
	commandSwitchToPull,
	commandPullViewItemSwitchToPull,
	commandPullViewItemOpenPullOnGitHub,
} from './pull';
import { commandOpenGitpod } from './gitpod';
import {
	commandDiffViewOpenLeftFile,
	commandDiffViewOpenRightFile,
} from './editor';

const commands: { id: string; callback: (...args: any[]) => any }[] = [
	// validate GitHub OAuth Token
	{ id: 'github1s.validate-token', callback: commandValidateToken },
	// update GitHub OAuth Token
	{ id: 'github1s.update-token', callback: commandUpdateToken },
	// clear GitHub OAuth Token
	{ id: 'github1s.clear-token', callback: commandClearToken },

	// get current authority (`${owner}+${repo}+${ref}`)
	{ id: 'github1s.get-current-authority', callback: commandGetCurrentAuthority }, // prettier-ignore
	// checkout to other branch/tag/commit
	{ id: 'github1s.checkout-ref', callback: commandCheckoutRef },

	// switch to a pull request
	{ id: 'github1s.switch-to-pull', callback: commandSwitchToPull },
	// switch to a pull request
	{ id: 'github1s.pull-view-item-switch-to-pull', callback: commandPullViewItemSwitchToPull }, // prettier-ignore
	// switch to a pull request
	{ id: 'github1s.pull-view-item-open-on-github', callback: commandPullViewItemOpenPullOnGitHub }, // prettier-ignore

	// open current repository on gitpod
	{ id: 'github1s.open-gitpod', callback: commandOpenGitpod },

	// open the left file in diff editor
	{ id: 'github1s.diff-view-open-left-file', callback: commandDiffViewOpenLeftFile }, // prettier-ignore
	// open the right file in diff editor
	{ id: 'github1s.diff-view-open-right-file', callback: commandDiffViewOpenRightFile }, // prettier-ignore
];

export const registerGitHub1sCommands = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		...commands.map((command) =>
			vscode.commands.registerCommand(command.id, command.callback)
		)
	);
};
