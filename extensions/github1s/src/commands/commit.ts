/**
 * @file GitHub1s Commit Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getAdapter } from '@/adapters';
import { Repository } from '@/repository';
import { getCommitDescription } from '@/helpers/commit';
import { getChangedFileDiffCommand, getCommitChangedFiles } from '@/changes/files';

type CommitCommandArgument = string | vscode.TimelineItem | vscode.SourceControl;

interface CommitContext {
	scheme: string;
	repo: string;
	sha?: string;
}

// SCM menus pass (sourceControl, historyItem); timeline menus pass (item, uri, source).
const resolveCommitContext = (
	item?: CommitCommandArgument,
	historyItemOrUri?: vscode.SourceControlHistoryItem | vscode.Uri,
): CommitContext => {
	if (historyItemOrUri && 'scheme' in historyItemOrUri) {
		// for extensions/github1s/src/changes/history.ts
		const { scheme, repo } = router.parseUri(historyItemOrUri);
		return { scheme, repo, sha: typeof item === 'object' ? item.id : item };
	}

	let sha: string | undefined;
	if (historyItemOrUri && 'id' in historyItemOrUri) {
		// for extensions/github1s/src/providers/timeline.ts
		sha = historyItemOrUri.id;
	} else if (typeof item === 'string') {
		sha = item;
	}

	return { scheme: getAdapter().scheme, repo: router.getState().repo, sha };
};

const checkCommitExists = async (repo: string, commitSha: string, scheme?: string) => {
	const dataSoruce = await getAdapter(scheme).resolveDataSource();
	try {
		return !!(await dataSoruce.provideCommit(repo, commitSha));
	} catch (error) {
		const errorMessage =
			(error as any)?.response?.status === 404
				? `No commit found for commitSha: ${commitSha}`
				: error?.response?.data?.message;
		vscode.window.showErrorMessage(errorMessage || `Get commit ${commitSha}} error`);
		return false;
	}
};

const commandSwitchToCommit = async (
	commitItemOrSha?: CommitCommandArgument,
	historyItemOrUri?: vscode.SourceControlHistoryItem | vscode.Uri,
) => {
	const { scheme, repo, sha } = resolveCommitContext(commitItemOrSha, historyItemOrUri);
	let commitSha = sha;

	// if the a commitSha isn't provided, use quickInput
	if (!commitSha) {
		// manual input a commit sha
		const inputCommitShaItem: vscode.QuickPickItem = {
			label: '$(git-commit) Manual input the commit sha',
			alwaysShow: true,
		};
		// use the commit list as the candidates
		const repository = Repository.getInstance(scheme, repo);
		const commits = await repository.getCommitList();
		const commitItems: vscode.QuickPickItem[] = commits.map((commit) => ({
			commitSha: commit.sha,
			label: commit.message,
			description: getCommitDescription(commit),
		}));

		const choice = await vscode.window.showQuickPick<vscode.QuickPickItem & { commitSha?: string }>(
			[inputCommitShaItem, ...commitItems],
			{ matchOnDescription: true },
		);

		// select nothing
		if (!choice) {
			return;
		}

		// select `manual input the commit sha`
		if (choice === inputCommitShaItem) {
			commitSha = await vscode.window.showInputBox({
				placeHolder: 'Please input the commit sha',
			});
		} else {
			// select a commit sha
			commitSha = choice.commitSha;
		}
	}

	if (!commitSha) {
		return;
	}

	if (await checkCommitExists(repo, commitSha, scheme)) {
		const routerParser = await getAdapter(scheme).resolveRouterParser();
		router.replace(await routerParser.buildCommitPath(repo, commitSha));
	}
};

const commandOpenCommitOnOfficialPage = async (
	commitItemOrSha?: CommitCommandArgument,
	historyItemOrUri?: vscode.SourceControlHistoryItem | vscode.Uri,
) => {
	const { scheme, repo, sha } = resolveCommitContext(commitItemOrSha, historyItemOrUri);
	if (!sha) {
		return;
	}

	const routerParser = await getAdapter(scheme).resolveRouterParser();
	const commitPath = await routerParser.buildCommitPath(repo, sha);
	const commitLink = await routerParser.buildExternalLink(commitPath);
	return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(commitLink));
};

const commandDiffCommitFile = async (uri: vscode.Uri) => {
	const { scheme, repo, ref, path } = router.parseUri(uri);
	const repository = Repository.getInstance(scheme, repo);
	const commit = await repository.getCommitItem(ref);
	if (!commit) {
		throw new Error(`Commit not found: ${ref}`);
	}
	const files = await getCommitChangedFiles(commit, repository);
	const file =
		files.find((file) => file.headFileUri.path === path) || files.find((file) => file.baseFileUri.path === path);
	if (!file) {
		throw new Error(`No changes found for ${path} in ${commit.sha}`);
	}
	const command = getChangedFileDiffCommand(file);
	return vscode.commands.executeCommand(command.command, ...(command.arguments || []));
};

export const registerCommitCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.diffCommitFile', commandDiffCommitFile),
		vscode.commands.registerCommand('github1s.commands.searchCommit', commandSwitchToCommit),
		vscode.commands.registerCommand('github1s.commands.switchToCommit', commandSwitchToCommit),
		vscode.commands.registerCommand('github1s.commands.openCommitOnGitHub', commandOpenCommitOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCommitOnGitLab', commandOpenCommitOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCommitOnBitbucket', commandOpenCommitOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openCommitOnOfficialPage', commandOpenCommitOnOfficialPage),
	);
};
