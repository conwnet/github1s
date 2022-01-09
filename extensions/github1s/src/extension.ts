/**
 * @file extension entry
 * @author netcon
 */

import * as vscode from 'vscode';
import { setExtensionContext } from '@/helpers/context';
// import { registerGitHub1sCommands } from '@/commands';
import { registerVSCodeProviders } from '@/providers';
import { registerCustomViews } from '@/views';
// import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';
// import { showSponsors } from '@/sponsors';
// import { showGitpod } from '@/gitpod';
// import { activateSourceControl } from '@/source-control';
// import { registerEventListeners } from '@/listeners';
import { registerPlatformAdapters } from './adapters';
import router from '@/router';
// import { PageType } from './router/types';

const browserUrlManager = {
	getUrl: () => vscode.commands.executeCommand('github1s.vscode.get-browser-url') as Promise<string>,
	setUrl: (url: string) => vscode.commands.executeCommand('github1s.vscode.replace-browser-url', url) as Promise<void>,
};

export async function activate(context: vscode.ExtensionContext) {
	// set the global context for convenient
	setExtensionContext(context);

	// register platform adapters
	await registerPlatformAdapters();

	// Ensure the router has been initialized
	await router.initialize(browserUrlManager);

	// register VS Code providers
	registerVSCodeProviders();

	// // register the necessary event listeners
	// registerEventListeners();

	// // register custom views
	registerCustomViews();
	// // register GitHub1s Commands
	// registerGitHub1sCommands();

	// // activate SourceControl features,
	// activateSourceControl();

	// // sponsors in Status Bar
	// showSponsors();
	// showGitpod();

	// // initialize the VSCode's state
	// initialVSCodeState();
}

// initialize the VSCode's state according to the router url
// const initialVSCodeState = async () => {
// 	const routerState = await router.getState();
// 	const { filePath, pageType } = routerState;
// 	const scheme = 'github1s';

// 	if (filePath && pageType === PageType.TREE) {
// 		vscode.commands.executeCommand('revealInExplorer', vscode.Uri.parse('').with({ scheme, path: filePath }));
// 	} else if (filePath && pageType === PageType.BLOB) {
// 		const { startLineNumber, endLineNumber } = routerState;
// 		const start = new vscode.Position(startLineNumber - 1, 0);
// 		const end = new vscode.Position(endLineNumber - 1, 999999);
// 		const documentShowOptions: vscode.TextDocumentShowOptions = startLineNumber
// 			? { selection: new vscode.Range(start, end) }
// 			: {};

// 		// TODO: the selection of the opening file may be cleared
// 		// when editor try to restore previous state in the same file
// 		vscode.commands.executeCommand(
// 			'vscode.open',
// 			vscode.Uri.parse('').with({ scheme, path: filePath }),
// 			documentShowOptions
// 		);
// 	} else if (pageType === PageType.PULL_LIST) {
// 		vscode.commands.executeCommand('github1s.views.pull-request-list.focus');
// 	} else if (pageType === PageType.COMMIT_LIST) {
// 		vscode.commands.executeCommand('github1s.views.commit-list.focus');
// 	} else if ([PageType.PULL, PageType.COMMIT].includes(pageType)) {
// 		vscode.commands.executeCommand('workbench.scm.focus');
// 	}
// };
