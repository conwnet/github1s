/**
 * @file GitHub Commit List View
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import { relativeTimeTo } from '@/helpers/date';
import { GitHub1sSourceControlDecorationProvider } from '@/providers/source-control-decoration-provider';
import { getChangedFileCommand, getCommitChangedFiles } from '@/source-control/changes';
import adapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';
import router from '@/router';
import { CommitManager } from './commit-manager';
import { Barrier } from '@/helpers/async';

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

const createLoadMoreChangedFilesItem = (commitSha: string): vscode.TreeItem => ({
	label: 'Load more',
	tooltip: 'Load more changed files',
	command: {
		title: 'Load more changed files',
		command: 'github1s.commit-view-load-more-changed-files',
		tooltip: 'Load more changed files',
		arguments: [commitSha],
	},
});

export class CommitTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewType = 'github1s.views.commit-list';

	private _forceUpdate = false;
	private _loadingBarrier: Barrier | null = null;
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	public updateTree(forceUpdate = true) {
		this._forceUpdate = forceUpdate;
		this._onDidChangeTreeData.fire();
	}

	public async loadMoreCommits() {
		if (!this._loadingBarrier || this._loadingBarrier.isOpen()) {
			this._loadingBarrier = new Barrier(5000);
			this.updateTree(false);
			const scheme = adapterManager.getCurrentScheme();
			const { repo } = await router.getState();
			await CommitManager.getInstance(scheme, repo)!.loadMore();
			this._loadingBarrier.open();
		}
	}

	public async loadMoreChangedFiles(commitSha: string) {
		if (!this._loadingBarrier || this._loadingBarrier.isOpen()) {
			this._loadingBarrier = new Barrier(5000);
			this.updateTree(false);
			const scheme = adapterManager.getCurrentScheme();
			const { repo } = await router.getState();
			await CommitManager.getInstance(scheme, repo)!.loadMoreChangedFiles(commitSha);
			this._loadingBarrier.open();
		}
	}

	async getCommitItems(): Promise<vscode.TreeItem[]> {
		this._loadingBarrier && (await this._loadingBarrier.wait());
		const currentAdapter = adapterManager.getCurrentAdapter();
		const { repo, ref } = await router.getState();
		const commitManager = CommitManager.getInstance(currentAdapter.scheme, repo)!;
		const repositoryCommits = await commitManager.getList(ref, '', this._forceUpdate);
		const commitTreeItems = repositoryCommits.map((commit) => {
			const label = `${commit.message}`;
			const description = getCommitTreeItemDescription(commit);
			const tooltip = `${label} (${description})`;
			const iconPath = vscode.Uri.parse(commit.avatarUrl);
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
		this._forceUpdate = false;
		const hasMore = await commitManager.hasMore(ref);
		return hasMore ? [...commitTreeItems, loadMoreCommitItem] : commitTreeItems;
	}

	async getCommitFileItems(commit: adapterTypes.Commit): Promise<vscode.TreeItem[]> {
		const changedFiles = await getCommitChangedFiles(commit);
		const changedFileItems = changedFiles.map((changedFile) => {
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
		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();
		const commitManager = CommitManager.getInstance(scheme, repo)!;
		const hasMore = await commitManager.hasMoreChangedFiles(commit.sha);
		const loadMoreChangedFilesItem = createLoadMoreChangedFilesItem(commit.sha);
		return hasMore ? [...changedFileItems, loadMoreChangedFilesItem] : changedFileItems;
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
}
