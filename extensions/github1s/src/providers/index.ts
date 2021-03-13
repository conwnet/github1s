/**
 * @file register VS Code providers
 * @author fezhang
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';
import { GitHub1sFileSearchProvider } from './fileSearchProvider';
import { GitHub1sTextSearchProvider } from './textSearchProvider';
import { GitHub1sSubmoduleDecorationProvider } from './submoduleDecorationProvider';
import { GitHub1sChangedFileDecorationProvider } from './changedFileDecorationProvider';

export const registerVSCodeProviders = () => {
	const context = getExtensionContext();
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
		),
		vscode.window.registerFileDecorationProvider(
			new GitHub1sChangedFileDecorationProvider()
		)
	);
};
