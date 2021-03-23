/**
 * @file GitHub Pull Request List View
 * @author netcon
 */

import * as vscode from 'vscode';
import { relativeTimeTo } from '@/helpers/date';
import repository, { RepositoryPull } from '@/repository';
import { GitHub1sSourceControlDecorationProvider } from '@/providers/sourceControlDecorationProvider';
import {
	getChangedFileCommand,
	getPullChangeFiles,
} from '@/source-control/changes';

enum PullStatus {
	OPEN = 'open',
	CLOSED = 'closed',
	MERGED = 'merged',
}

const getPullStatus = (pull: RepositoryPull): PullStatus => {
	// current pull request is open
	if (pull.state === 'open') {
		return PullStatus.OPEN;
	}

	// current pull request is merged
	if (pull.state === 'closed' && pull.merged_at) {
		return PullStatus.MERGED;
	}

	// current pull is closed
	return PullStatus.CLOSED;
};

const getPullTreeItemDescription = (pull: RepositoryPull) => {
	const pullStatus = getPullStatus(pull);

	// current pull request is open
	if (pullStatus === PullStatus.OPEN) {
		return `opened ${relativeTimeTo(pull.created_at)} by ${pull.user.login}`;
	}

	// current pull request is merged
	if (pullStatus === PullStatus.MERGED) {
		return `by ${pull.user.login} was merged ${relativeTimeTo(pull.merged_at)}`;
	}

	// current pull is closed
	return `by ${pull.user.login} was closed ${relativeTimeTo(pull.closed_at)}`;
};

const statusIconMap = {
	[PullStatus.OPEN]: '🟢',
	[PullStatus.CLOSED]: '🔴',
	[PullStatus.MERGED]: '🟣',
};

export interface PullTreeItem extends vscode.TreeItem {
	pull: RepositoryPull;
}

export class PullRequestTreeDataProvider
	implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewType = 'github1s.views.pull-request-list';

	async getPullItems(): Promise<PullTreeItem[]> {
		// only recent 100 pull requests will be list here
		// TODO: implement pagination
		const repositoryPulls = await repository.getPulls();
		return repositoryPulls.map((pull) => {
			const statusIcon = statusIconMap[getPullStatus(pull)];
			const label = `${statusIcon} #${pull.number} ${pull.title}`;
			const description = getPullTreeItemDescription(pull);
			const tooltip = `${label} (${description})`;
			const iconPath = vscode.Uri.parse(pull.user.avatar_url);
			const contextValue = 'github1s:pull-request';

			return {
				pull,
				label,
				iconPath,
				description,
				tooltip,
				contextValue,
				resourceUri: vscode.Uri.parse('').with({
					scheme: GitHub1sSourceControlDecorationProvider.pullSchema,
					query: `number=${pull.number}`,
				}),
				collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
			};
		});
	}

	async getPullFileItems(pull: RepositoryPull): Promise<vscode.TreeItem[]> {
		const changeFiles = await getPullChangeFiles(pull);

		return changeFiles.map((changeFile) => {
			const filePath = changeFile.headFileUri.path;
			const id = `${pull.number} ${filePath}`;
			const command = getChangedFileCommand(changeFile);

			return {
				id,
				command,
				description: true,
				resourceUri: changeFile.headFileUri.with({
					scheme: GitHub1sSourceControlDecorationProvider.fileSchema,
					query: `status=${changeFile.status}`,
				}),
				collapsibleState: vscode.TreeItemCollapsibleState.None,
			};
		});
	}

	getTreeItem(
		element: vscode.TreeItem
	): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(
		element?: vscode.TreeItem
	): vscode.ProviderResult<vscode.TreeItem[]> {
		if (!element) {
			return this.getPullItems();
		}
		const pull = (element as PullTreeItem)?.pull;
		return pull ? this.getPullFileItems(pull) : [];
	}
}
