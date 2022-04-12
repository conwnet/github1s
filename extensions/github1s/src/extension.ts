/**
 * @file extension entry
 * @author netcon
 */

import router from '@/router';
import * as vscode from 'vscode';
import { showGitpod } from '@/gitpod';
import { showSponsors } from '@/sponsors';
import { PageType } from './adapters/types';
import { registerCustomViews } from '@/views';
import { registerEventListeners } from '@/listeners';
import { registerVSCodeProviders } from '@/providers';
import { registerGitHub1sCommands } from '@/commands';
import { setExtensionContext } from '@/helpers/context';
import { activateSourceControl } from '@/source-control';
import { adapterManager, registerAdapters } from '@/adapters';

const browserUrlManager = {
	getUrl: () => vscode.commands.executeCommand('github1s.vscode.get-browser-url') as Promise<string>,
	setUrl: (url: string) => vscode.commands.executeCommand('github1s.vscode.replace-browser-url', url) as Promise<void>,
};

export async function activate(context: vscode.ExtensionContext) {
	// set the global context for convenient
	setExtensionContext(context);

	// register platform adapters
	await registerAdapters();

	// Ensure the router has been initialized
	await router.initialize(browserUrlManager);

	// register VS Code providers
	registerVSCodeProviders();

	// register the necessary event listeners
	registerEventListeners();

	// register GitHub1s Commands
	registerGitHub1sCommands();

	// register custom views
	registerCustomViews();

	// activate SourceControl features,
	activateSourceControl();

	// sponsors in Status Bar
	showSponsors();

	showGitpod();

	// initialize the VSCode's state
	initialVSCodeState();
}

// initialize the VSCode's state according to the router url
const initialVSCodeState = async () => {
	const routerState = await router.getState();
	const scheme = adapterManager.getCurrentScheme();

	if (routerState.pageType === PageType.Tree && routerState.filePath) {
		vscode.commands.executeCommand(
			'revealInExplorer',
			vscode.Uri.parse('').with({ scheme, path: `/${routerState.filePath}` })
		);
	} else if (routerState.pageType === PageType.Blob && routerState.filePath) {
		const { startLine, endLine } = routerState;
		let documentShowOptions: vscode.TextDocumentShowOptions = {};
		if (startLine || endLine) {
			const startPosition = new vscode.Position((startLine || endLine)! - 1, 0);
			const endPosition = new vscode.Position((endLine || startLine)! - 1, 999999);
			documentShowOptions = { selection: new vscode.Range(startPosition, endPosition) };
		}
		// TODO: the selection of the opening file may be cleared
		// when editor try to restore previous state in the same file
		vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse('').with({ scheme, path: `/${routerState.filePath}` }),
			documentShowOptions
		);
	} else if (routerState.pageType === PageType.CodeReviewList) {
		vscode.commands.executeCommand('github1s.views.codeReviewList.focus');
	} else if (routerState.pageType === PageType.CommitList) {
		vscode.commands.executeCommand('github1s.views.commitList.focus');
	} else if ([PageType.CodeReview, PageType.Commit].includes(routerState.pageType)) {
		vscode.commands.executeCommand('workbench.scm.focus');
	}
};
