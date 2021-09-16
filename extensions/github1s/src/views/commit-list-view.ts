/**
 * @file GitHub Commit List View
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import { relativeTimeTo } from '@/helpers/date';
import repository from '@/repository';
import { RepositoryCommit } from '@/repository/types';
import { GitHub1sSourceControlDecorationProvider } from '@/providers/sourceControlDecorationProvider';
import { getChangedFileCommand, getCommitChangedFiles } from '@/source-control/changes';
import router from '@/router';

export const getCommitTreeItemDescription = (commit: RepositoryCommit): string => {
	return [commit.sha.slice(0, 7), commit.commit.author.name, relativeTimeTo(commit.commit.author.date)].join(', ');
};

export interface CommitTreeItem extends vscode.TreeItem {
	commit: RepositoryCommit;
}

const loadMoreCommitItem: vscode.TreeItem = {
	label: 'Load more',
	tooltip: 'Load more commits',
	command: {
		title: 'Load more commits',
		command: 'github1s.commit-view-load-more-commits',
		tooltip: 'Load more commits',
	},
};

export class CommitTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewType = 'github1s.views.commit-list';

	private forceUpdate = false;
	private _onDidChangeTreeData = new vscode.EventEmitter<undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	public updateTree(forceUpdate = true) {
		this.forceUpdate = forceUpdate;
		this._onDidChangeTreeData.fire(undefined);
	}

	async getCommitItems(): Promise<vscode.TreeItem[]> {
		const { ref } = await router.getState();
		const repositoryCommits = await repository.getCommitManager().getList(ref, this.forceUpdate);
		this.forceUpdate = false;
		const commitTreeItems = repositoryCommits.map((commit) => {
			const label = `${commit.commit.message}`;
			const description = getCommitTreeItemDescription(commit);
			const tooltip = `${label} (${description})`;
			const iconPath = commit.author ? vscode.Uri.parse(commit.author?.avatar_url) : '';
			const contextValue = 'github1s:commit';

			return {
				commit,
				label,
				iconPath,
				description,
				tooltip,
				contextValue,
				resourceUri: vscode.Uri.parse('').with({
					scheme: GitHub1sSourceControlDecorationProvider.commitSchema,
					query: queryString.stringify({ sha: commit.sha }),
				}),
				collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
			};
		});
		return (await repository.getCommitManager().hasMore()) ? [...commitTreeItems, loadMoreCommitItem] : commitTreeItems;
	}

	async getCommitFileItems(commit: RepositoryCommit): Promise<vscode.TreeItem[]> {
		const changedFiles = await getCommitChangedFiles(commit);

		return changedFiles.map((changedFile) => {
			const filePath = changedFile.headFileUri.path;
			const id = `${commit.sha} ${filePath}`;
			const command = getChangedFileCommand(changedFile);

			return {
				id,
				command,
				description: true,
				resourceUri: changedFile.headFileUri.with({
					scheme: GitHub1sSourceControlDecorationProvider.fileSchema,
					query: queryString.stringify({ status: changedFile.status }),
				}),
				collapsibleState: vscode.TreeItemCollapsibleState.None,
			};
		});
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
		if (!element) {
			return this.getCommitItems();
		}
		const commit = (element as CommitTreeItem)?.commit;
		return commit ? this.getCommitFileItems(commit) : [];
	}

	// the tooltip of the `CommitTreeItem` with `resourceUri` property won't show
	// correctly if miss this resolveTreeItem, it seems a bug of current version
	// vscode, and it has fixed in a newer version vscode
	resolveTreeItem(item: vscode.TreeItem, _element: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
		return item;
	}
}
