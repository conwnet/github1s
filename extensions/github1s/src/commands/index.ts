/**
 * @file github1s commands
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { pullRequestTreeDataProvider, commitTreeDataProvider } from '@/views';
import {
	commandValidateToken,
	commandUpdateToken,
	commandClearToken,
} from './token';
import { commandGetCurrentAuthority, commandCheckoutRef } from './ref';
import {
	commandSwitchToPull,
	commandPullViewItemSwitchToPull,
	commandPullViewItemOpenOnGitHub,
} from './pull';
import {
	commandSwitchToCommit,
	commandCommitViewItemSwitchToCommit,
	commandCommitViewItemOpenOnGitHub,
} from './commit';
import { commandOpenGitpod } from './gitpod';
import {
	commandEditorViewOpenChanges,
	commandDiffViewOpenLeftFile,
	commandDiffViewOpenRightFile,
	commandEditorViewOpenNextRevision,
	commandEditorViewOpenPrevRevision,
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

	// switch to a pull request & input pull number manually
	{ id: 'github1s.switch-to-pull', callback: commandSwitchToPull },
	// update the pull request list in the pull requests view
	{ id: 'github1s.pull-view-refresh-pull-list', callback: () => pullRequestTreeDataProvider.updateTree() }, // prettier-ignore
	// switch to a pull request in the pull requests view
	{ id: 'github1s.pull-view-item-switch-to-pull', callback: commandPullViewItemSwitchToPull }, // prettier-ignore
	// open pull on github in the pull requests view
	{ id: 'github1s.pull-view-item-open-on-github', callback: commandPullViewItemOpenOnGitHub }, // prettier-ignore

	// switch to a commit & input pull number manually
	{ id: 'github1s.switch-to-commit', callback: commandSwitchToCommit },
	// update the commit list in the commits view
	{ id: 'github1s.commit-view-refresh-commit-list', callback: () => commitTreeDataProvider.updateTree() }, // prettier-ignore
	// switch to a commit in the commits view
	{ id: 'github1s.commit-view-item-switch-to-commit', callback: commandCommitViewItemSwitchToCommit }, // prettier-ignore
	// open commit on github in the commits view
	{ id: 'github1s.commit-view-item-open-on-github', callback: commandCommitViewItemOpenOnGitHub }, // prettier-ignore

	// open current repository on gitpod
	{ id: 'github1s.open-gitpod', callback: commandOpenGitpod },

	// open the changes of a file
	{ id: 'github1s.editor-view-open-changes', callback: commandEditorViewOpenChanges }, // prettier-ignore
	// open the left file in diff editor
	{ id: 'github1s.diff-view-open-left-file', callback: commandDiffViewOpenLeftFile }, // prettier-ignore
	// open the right file in diff editor
	{ id: 'github1s.diff-view-open-right-file', callback: commandDiffViewOpenRightFile }, // prettier-ignore
	// open the previous revision of a file
	{ id: 'github1s.editor-view-open-prev-revision', callback: commandEditorViewOpenPrevRevision }, // prettier-ignore
	// open the next revision of a file
	{ id: 'github1s.editor-view-open-next-revision', callback: commandEditorViewOpenNextRevision }, // prettier-ignore
];

export const registerGitHub1sCommands = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		...commands.map((command) =>
			vscode.commands.registerCommand(command.id, command.callback)
		)
	);
};
