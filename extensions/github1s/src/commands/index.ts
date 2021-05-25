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
	commandAuthorizingGithub,
	commandAuthorizingGithubWithOverlay,
} from './token';
import { commandGetCurrentAuthority, commandCheckoutRef } from './ref';
import {
	commandSwitchToPull,
	commandPullViewItemSwitchToPull,
	commandPullViewItemOpenOnGitHub,
	commandPullViewRefreshPullList,
	commandPullViewLoadMorePulls,
} from './pull';
import {
	commandSwitchToCommit,
	commandOpenCommitOnGitHub,
	commandCommitViewItemSwitchToCommit,
	commandCommitViewItemOpenOnGitHub,
	commandCommitViewRefreshCommitList,
	commandCommitViewLoadMoreCommits,
} from './commit';
import { commandOpenGitpod } from './gitpod';
import {
	commandEditorViewOpenChanges,
	commandDiffViewOpenLeftFile,
	commandDiffViewOpenRightFile,
	commandEditorViewOpenNextRevision,
	commandEditorViewOpenPrevRevision,
} from './editor';
import {
	commandToggleEditorGutterBlame,
	commandOpenEditorGutterBlame,
	commandCloseEditorGutterBlame,
} from './blame';
import { commandOpenOnGitHub } from './global';

const commands: { id: string; callback: (...args: any[]) => any }[] = [
	// validate GitHub OAuth Token
	{ id: 'github1s.validate-token', callback: commandValidateToken },
	// update GitHub OAuth Token
	{ id: 'github1s.update-token', callback: commandUpdateToken },
	// clear GitHub OAuth Token
	{ id: 'github1s.clear-token', callback: commandClearToken },
	// authorizing github with `Web application flow`
	{ id: 'github1s.authorizing-github', callback: commandAuthorizingGithub },
	// open the overlay on the page and authorizing github with `Web application flow`
	{ id: 'github1s.authorizing-github-with-overlay', callback: commandAuthorizingGithubWithOverlay }, // prettier-ignore

	// get current authority (`${owner}+${repo}+${ref}`)
	{ id: 'github1s.get-current-authority', callback: commandGetCurrentAuthority }, // prettier-ignore
	// checkout to other branch/tag/commit
	{ id: 'github1s.checkout-ref', callback: commandCheckoutRef },

	// switch to a pull request & input pull number manually
	{ id: 'github1s.switch-to-pull', callback: commandSwitchToPull },
	// update the pull request list in the pull requests view
	{ id: 'github1s.pull-view-refresh-pull-list', callback: commandPullViewRefreshPullList }, // prettier-ignore
	// load more pulls in the pull requests tree view
	{ id: 'github1s.pull-view-load-more-pulls', callback: commandPullViewLoadMorePulls }, // prettier-ignore
	// switch to a pull request in the pull requests view
	{ id: 'github1s.pull-view-item-switch-to-pull', callback: commandPullViewItemSwitchToPull }, // prettier-ignore
	// open pull on github in the pull requests view
	{ id: 'github1s.pull-view-item-open-on-github', callback: commandPullViewItemOpenOnGitHub }, // prettier-ignore

	// switch to a commit & input pull number manually
	{ id: 'github1s.switch-to-commit', callback: commandSwitchToCommit },
	// open a commit on GitHub's website
	{ id: 'github1s.open-commit-on-github', callback: commandOpenCommitOnGitHub },
	// update the commit list in the commits view
	{ id: 'github1s.commit-view-refresh-commit-list', callback: commandCommitViewRefreshCommitList }, // prettier-ignore
	// load more commits in the commits tree view
	{ id: 'github1s.commit-view-load-more-commits', callback: commandCommitViewLoadMoreCommits }, // prettier-ignore
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

	// toggle the gutter blame of a editor
	{ id: 'github1s.toggle-editor-gutter-blame', callback: commandToggleEditorGutterBlame }, // prettier-ignore
	// open the gutter blame of a editor
	{ id: 'github1s.open-editor-gutter-blame', callback: commandOpenEditorGutterBlame }, // prettier-ignore
	// close the gutter blame of a editor
	{ id: 'github1s.close-editor-gutter-blame', callback: commandCloseEditorGutterBlame }, // prettier-ignore

	// open current page on GitHub
	{ id: 'github1s.open-on-github', callback: commandOpenOnGitHub },
];

export const registerGitHub1sCommands = () => {
	const context = getExtensionContext();

	context.subscriptions.push(
		...commands.map((command) =>
			vscode.commands.registerCommand(command.id, command.callback)
		)
	);

	vscode.commands.registerCommand('github1s.dev-test', () => {
		console.log(vscode.window.activeTextEditor);
	});
};
