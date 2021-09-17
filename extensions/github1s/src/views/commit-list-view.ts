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
import platformAdapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';
import router from '@/router';

export const getCommitTreeItemDescription = (commit: adapterTypes.Commit): string => {
	return [commit.sha.slice(0, 7), commit.author, relativeTimeTo(commit.createTime)].join(', ');
};

export interface CommitTreeItem extends vscode.TreeItem {
	commit: adapterTypes.Commit;
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

	private async _resolveCurrentDataSource() {
		return platformAdapterManager.getCurrentAdapter().resolveDataSource();
	}

	async getCommitItems(): Promise<vscode.TreeItem[]> {
		const { repo, ref } = await router.getState();
		const dataSource = await this._resolveCurrentDataSource();
		const queryOptions = { page: 1, pageSize: 100, from: ref };
		const repositoryCommits = await dataSource.provideCommits(repo, queryOptions);
		this.forceUpdate = false;
		const commitTreeItems = repositoryCommits.map((commit) => {
			const label = `${commit.message}`;
			const description = getCommitTreeItemDescription(commit);
			const tooltip = `${label} (${description})`;
			const iconPath = vscode.Uri.parse(dataSource.provideUserAvatarLink(commit.author));
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
		return [...commitTreeItems, loadMoreCommitItem];
	}

	async getCommitFileItems(commit: adapterTypes.Commit): Promise<vscode.TreeItem[]> {
		const { repo } = await router.getState();
		const dataSource = await this._resolveCurrentDataSource();
		const repositoryCommit = await dataSource.provideCommit(repo, commit.sha);

		return repositoryCommit.files.map((changedFile) => {
			const filePath = changedFile.path;
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
