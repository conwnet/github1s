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
	commandCheckoutRef,
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
import router from '@/router';
import { activateSourceControl } from '@/source-control';
import { registerEventListeners } from '@/listeners';
import { PageType } from './router/types';

export async function activate(context: vscode.ExtensionContext) {
	// set the global context for convenient
	setExtensionContext(context);
	// Ensure the router has been initialized at first
	await router.initialize();
	// register the necessary event listeners
	registerEventListeners();

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

		// open current repository on gitpod
		vscode.commands.registerCommand('github1s.open-gitpod', commandOpenGitpod)
	);

	// activate SourceControl features,
	activateSourceControl();

	// sponsors in Status Bar
	showSponsors();
	await showGitpod();

	// open corresponding editor if there is a filePath specified in browser url
	const { filePath, pageType } = await router.getState();
	if (filePath && [PageType.TREE, PageType.BLOB].includes(pageType)) {
		vscode.commands.executeCommand(
			pageType === PageType.TREE ? 'revealInExplorer' : 'vscode.open',
			vscode.Uri.parse('').with({
				scheme: GitHub1sFileSystemProvider.scheme,
				path: filePath,
			})
		);
	}
}
