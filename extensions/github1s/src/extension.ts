/**
 * @file extension entry
 * @author netcon
 */

import * as vscode from 'vscode';
import { SettingsView } from '@/views/settings-view';
import { setExtensionContext } from '@/helpers/context';
import {
	commandUpdateToken,
	commandValidateToken,
	commandClearToken,
	commandSwitchBranch,
	commandSwitchTag,
	commandGetCurrentAuthority,
	commandOpenGitpod,
} from '@/commands';
import {
	GitHub1sFileSystemProvider,
	GitHub1sFileSearchProvider,
	GitHub1sTextSearchProvider,
	GitHub1sSubmoduleDecorationProvider,
} from '@/providers';
import { showSponsors } from '@/sponsors';
import { showGitpod } from '@/gitpod';

export async function activate(context: vscode.ExtensionContext) {
	setExtensionContext(context);

	// providers
	const fsProvider = new GitHub1sFileSystemProvider();
	context.subscriptions.push(
		vscode.workspace.registerFileSystemProvider(
			GitHub1sFileSystemProvider.scheme,
			fsProvider,
			{
				isCaseSensitive: true,
				isReadonly: true,
			}
		),
		vscode.workspace.registerFileSearchProvider(
			GitHub1sFileSearchProvider.scheme,
			new GitHub1sFileSearchProvider(fsProvider)
		),
		vscode.workspace.registerTextSearchProvider(
			GitHub1sTextSearchProvider.scheme,
			new GitHub1sTextSearchProvider()
		),
		vscode.window.registerFileDecorationProvider(
			new GitHub1sSubmoduleDecorationProvider(fsProvider)
		)
	);

	// views
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SettingsView.viewType,
			new SettingsView()
		)
	);

	// commands
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'github1s.validate-token',
			commandValidateToken
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.update-token', commandUpdateToken)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.clear-token', commandClearToken)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'github1s.get-current-authority',
			commandGetCurrentAuthority
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'github1s.switch-branch',
			commandSwitchBranch
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.switch-tag', commandSwitchTag)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.open-gitpod', commandOpenGitpod)
	);

	// sponsors in Status Bar
	showSponsors();
	await showGitpod();
}
