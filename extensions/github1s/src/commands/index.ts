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
	commandSwitchToCodeReview,
	commandCodeReviewViewItemSwitchToCodeReview,
	commandCodeReviewViewItemOpenOnOfficialPage,
	commandCodeReviewViewRefreshCodeReviewList,
	commandCodeReviewViewLoadMoreCodeReviews,
	commandCodeReviewViewLoadMoreChangedFiles,
} from './code-review';
import {
	commandSwitchToCommit,
	commandCommitViewItemSwitchToCommit,
	commandCommitViewItemOpenOnOfficialPage,
	commandCommitViewRefreshCommitList,
	commandCommitViewLoadMoreCommits,
	commandCommitViewLoadMoreChangedFiles,
} from './commit';
import { commandOpenGitpod } from './gitpod';
import {
	commandEditorViewOpenChanges,
	commandDiffViewOpenLeftFile,
	commandDiffViewOpenRightFile,
	commandEditorViewOpenNextRevision,
	commandEditorViewOpenPrevRevision,
} from './editor';
import { commandToggleEditorGutterBlame, commandOpenEditorGutterBlame, commandCloseEditorGutterBlame } from './blame';
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

	// switch to a code review & input code review id manually
	{ id: 'github1s.switch-to-code-review', callback: commandSwitchToCodeReview },
	// update the code review list in the code reviews view
	{ id: 'github1s.code-review-view-refresh-code-review-list', callback: commandCodeReviewViewRefreshCodeReviewList }, // prettier-ignore
	// load more code reviews in the code reviews tree view
	{ id: 'github1s.code-review-view-load-more-code-reviews', callback: commandCodeReviewViewLoadMoreCodeReviews }, // prettier-ignore
	// load more changed files in the code reviews tree view
	{ id: 'github1s.code-review-view-load-more-changed-files', callback: commandCodeReviewViewLoadMoreChangedFiles }, // prettier-ignore
	// switch to a code review in the code reviews view
	{ id: 'github1s.code-review-view-item-switch-to-code-review', callback: commandCodeReviewViewItemSwitchToCodeReview }, // prettier-ignore
	// open cod reviews on official page in the code reviews view
	{ id: 'github1s.code-review-view-item-open-on-official-page', callback: commandCodeReviewViewItemOpenOnOfficialPage }, // prettier-ignore

	// switch to a commit & input commit sha manually
	{ id: 'github1s.switch-to-commit', callback: commandSwitchToCommit },
	// update the commit list in the commits view
	{ id: 'github1s.commit-view-refresh-commit-list', callback: commandCommitViewRefreshCommitList }, // prettier-ignore
	// load more commits in the commits tree view
	{ id: 'github1s.commit-view-load-more-commits', callback: commandCommitViewLoadMoreCommits }, // prettier-ignore
	// load more commits in the commits tree view
	{ id: 'github1s.commit-view-load-more-changed-files', callback: commandCodeReviewViewLoadMoreChangedFiles }, // prettier-ignore
	// switch to a commit in the commits view
	{ id: 'github1s.commit-view-item-switch-to-commit', callback: commandCommitViewItemSwitchToCommit }, // prettier-ignore
	// open commit on github in the commits view
	{ id: 'github1s.commit-view-item-open-on-official-page', callback: commandCodeReviewViewItemOpenOnOfficialPage }, // prettier-ignore

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
		...commands.map((command) => vscode.commands.registerCommand(command.id, command.callback))
	);

	vscode.commands.registerCommand('github1s.dev-test', () => {
		console.log(vscode.window.activeTextEditor);
	});
};
