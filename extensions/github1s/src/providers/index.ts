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
import { GitHub1sSourceControlDecorationProvider } from './sourceControlDecorationProvider';
import { GitHub1sDefinitionProvider } from './definitionProvider';
import { GitHub1sReferenceProvider } from './referenceProvider';
import { GitHub1sHoverProvider } from './hoverProvider';

export const fileSystemProvider = new GitHub1sFileSystemProvider();
export const fileSearchProvider = new GitHub1sFileSearchProvider(
	fileSystemProvider
);
export const textSearchProvider = new GitHub1sTextSearchProvider();
export const submoduleDecorationProvider = new GitHub1sSubmoduleDecorationProvider(
	fileSystemProvider
);
export const changedFileDecorationProvider = new GitHub1sChangedFileDecorationProvider();
export const sourceControlDecorationProvider = new GitHub1sSourceControlDecorationProvider();
export const definitionProvider = new GitHub1sDefinitionProvider();
export const referenceProvider = new GitHub1sReferenceProvider();
export const hoverProvider = new GitHub1sHoverProvider();

export const EMPTY_FILE_SCHEME = 'github1s-empty-file';
export const emptyFileUri = vscode.Uri.parse('').with({
	scheme: EMPTY_FILE_SCHEME,
});

export const registerVSCodeProviders = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		vscode.workspace.registerFileSystemProvider(
			GitHub1sFileSystemProvider.scheme,
			fileSystemProvider,
			{ isCaseSensitive: true, isReadonly: true }
		),
		vscode.workspace.registerFileSearchProvider(
			GitHub1sFileSearchProvider.scheme,
			fileSearchProvider
		),
		vscode.workspace.registerTextSearchProvider(
			GitHub1sTextSearchProvider.scheme,
			textSearchProvider
		),
		vscode.window.registerFileDecorationProvider(submoduleDecorationProvider),
		vscode.window.registerFileDecorationProvider(changedFileDecorationProvider),
		vscode.window.registerFileDecorationProvider(
			sourceControlDecorationProvider
		),

		vscode.languages.registerDefinitionProvider(
			{ scheme: GitHub1sDefinitionProvider.scheme },
			definitionProvider
		),
		vscode.languages.registerReferenceProvider(
			{ scheme: GitHub1sReferenceProvider.scheme },
			referenceProvider
		),
		vscode.languages.registerHoverProvider(
			{ scheme: GitHub1sHoverProvider.scheme },
			hoverProvider
		),

		// provider a readonly empty file for diff
		vscode.workspace.registerTextDocumentContentProvider(EMPTY_FILE_SCHEME, {
			provideTextDocumentContent: () => '',
		})
	);
};
