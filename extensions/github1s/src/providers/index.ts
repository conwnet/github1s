/**
 * @file register VS Code providers
 * @author netcon
 */

import * as vscode from 'vscode';
import adapterManager from '@/adapters/manager';
import { getExtensionContext } from '@/helpers/context';
import { GitHub1sFileSystemProvider } from './file-system';
import { GitHub1sFileSearchProvider } from './file-search';
import { GitHub1sTextSearchProvider } from './text-search';
import { GitHub1sSubmoduleDecorationProvider } from './decorations/submodule';
import { GitHub1sChangedFileDecorationProvider } from './decorations/changed-file';
import { GitHub1sSourceControlDecorationProvider } from './decorations/source-control';
import { GitHub1sDefinitionProvider } from './definition';
import { GitHub1sReferenceProvider } from './reference';
import { GitHub1sHoverProvider } from './hover';

export const EMPTY_FILE_SCHEME = 'github1s-empty-file';
export const emptyFileUri = vscode.Uri.parse('').with({
	scheme: EMPTY_FILE_SCHEME,
});

export const registerVSCodeProviders = () => {
	const context = getExtensionContext();

	const allSchemes = adapterManager.getAllAdapters().map((item) => item.scheme);

	allSchemes.forEach((scheme) => {
		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(scheme, GitHub1sFileSystemProvider.getInstance(), {
				isCaseSensitive: true,
				isReadonly: true,
			}),
			vscode.workspace.registerFileSearchProvider(scheme, GitHub1sFileSearchProvider.getInstance()),
			vscode.workspace.registerTextSearchProvider(scheme, GitHub1sTextSearchProvider.getInstance()),
			vscode.languages.registerDefinitionProvider({ scheme }, GitHub1sDefinitionProvider.getInstance()),
			vscode.languages.registerReferenceProvider({ scheme }, GitHub1sReferenceProvider.getInstance()),
			vscode.languages.registerHoverProvider({ scheme }, GitHub1sHoverProvider.getInstance())
		);
	});

	context.subscriptions.push(
		vscode.window.registerFileDecorationProvider(GitHub1sSubmoduleDecorationProvider.getInstance()),
		vscode.window.registerFileDecorationProvider(GitHub1sChangedFileDecorationProvider.getInstance()),
		vscode.window.registerFileDecorationProvider(GitHub1sSourceControlDecorationProvider.getInstance()),
		// provider a readonly empty file for diff
		vscode.workspace.registerTextDocumentContentProvider(EMPTY_FILE_SCHEME, {
			provideTextDocumentContent: () => '',
		})
	);
};
