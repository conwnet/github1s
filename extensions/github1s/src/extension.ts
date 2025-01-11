/**
 * @file extension entry
 * @author netcon
 */

import router from '@/router';
import * as vscode from 'vscode';
import { PageType } from './adapters/types';
import { registerCustomViews } from '@/views';
import { decorateStatusBar } from '@/statusbar';
import { registerEventListeners } from '@/listeners';
import { registerVSCodeProviders } from '@/providers';
import { registerGitHub1sCommands } from '@/commands';
import { updateSourceControlChanges } from '@/changes';
import { adapterManager, registerAdapters } from '@/adapters';
import { addRecentRepositories, setExtensionContext } from '@/helpers/context';

const browserUrlManager = {
	href: () => vscode.commands.executeCommand('github1s.commands.vscode.getBrowserUrl') as Promise<string>,
	push: (url: string) =>
		vscode.commands.executeCommand('github1s.commands.vscode.pushBrowserUrl', url) as Promise<void>,
	replace: (url: string) =>
		vscode.commands.executeCommand('github1s.commands.vscode.replaceBrowserUrl', url) as Promise<void>,
};

// eslint-disable-next-line jsdoc/require-jsdoc
export async function activate(context: vscode.ExtensionContext) {
	// set the global context for convenient
	setExtensionContext(context);

	// register platform adapters
	await registerAdapters();

	// Ensure the router has been initialized
	await router.initialize(browserUrlManager);

	// do follow-up works in parallel
	await Promise.all([
		registerVSCodeProviders(),
		registerEventListeners(),
		registerGitHub1sCommands(),
		registerCustomViews(),
		updateSourceControlChanges(),
		decorateStatusBar(),
	]);

	initialVSCodeState();
}

// initialize the VSCode's state according to the router url
const initialVSCodeState = async () => {
	const routerState = await router.getState();
	const scheme = adapterManager.getCurrentScheme();

	if (routerState.pageType === PageType.Tree && routerState.filePath) {
		vscode.commands.executeCommand(
			'revealInExplorer',
			vscode.Uri.parse('').with({ scheme, path: `/${routerState.filePath}` }),
		);
	} else if (routerState.pageType === PageType.Blob && routerState.filePath) {
		const { startLine, endLine } = routerState;
		let documentShowOptions: vscode.TextDocumentShowOptions = {};
		if (startLine || endLine) {
			const startPosition = new vscode.Position((startLine || endLine)! - 1, 0);
			const endPosition = new vscode.Position((endLine || startLine)! - 1, 1 << 20);
			documentShowOptions = { selection: new vscode.Range(startPosition, endPosition) };
		}
		vscode.window.showTextDocument(
			vscode.Uri.parse('').with({ scheme, path: `/${routerState.filePath}` }),
			documentShowOptions,
		);
	} else if (routerState.pageType === PageType.CodeReviewList) {
		vscode.commands.executeCommand('github1s.views.codeReviewList.focus');
	} else if (routerState.pageType === PageType.CommitList) {
		vscode.commands.executeCommand('github1s.views.commitList.focus');
	} else if ([PageType.CodeReview, PageType.Commit].includes(routerState.pageType)) {
		vscode.commands.executeCommand('workbench.scm.focus');
	} else if (routerState.pageType === PageType.Search) {
		vscode.commands.executeCommand('workbench.action.findInFiles', routerState);
	}
	routerState.repo && addRecentRepositories(routerState.repo);
};
