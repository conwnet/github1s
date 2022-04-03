/**
 * @file GitHub Pull Request List View
 * @author netcon
 */

import * as vscode from 'vscode';
import { relativeTimeTo } from '@/helpers/date';
import { GitHub1sSourceControlDecorationProvider } from '@/providers/sourceControlDecorationProvider';
import platformAdapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';
import * as queryString from 'query-string';
import router from '@/router';
import { getChangedFileCommand, getPullChangedFiles } from '@/source-control/changes';

enum CodeReviewState {
	OPEN = 'open',
	CLOSED = 'closed',
	MERGED = 'merged',
}

const getCodeReviewStatus = (codeReview: adapterTypes.CodeReview): CodeReviewState => {
	// current pull request is open
	if (codeReview.state === adapterTypes.CodeReviewState.Open) {
		return CodeReviewState.OPEN;
	}

	// current pull request is merged
	if (codeReview.state === adapterTypes.CodeReviewState.Closed && codeReview.mergeTime) {
		return CodeReviewState.MERGED;
	}

	// current pull is closed
	return CodeReviewState.CLOSED;
};

const statusIconMap = {
	[CodeReviewState.OPEN]: '🟢',
	[CodeReviewState.CLOSED]: '🔴',
	[CodeReviewState.MERGED]: '🟣',
};

export const getPullTreeItemLabel = (codeReview: adapterTypes.CodeReview) => {
	const statusIcon = statusIconMap[getCodeReviewStatus(codeReview)];
	return `${statusIcon} #${codeReview.id} ${codeReview.title}`;
};

export const getPullTreeItemDescription = (codeReview: adapterTypes.CodeReview) => {
	const codeReviewStatus = getCodeReviewStatus(codeReview);

	// current pull request is open
	if (codeReviewStatus === CodeReviewState.OPEN) {
		return `opened ${relativeTimeTo(codeReview.createTime)} by ${codeReview.creator}`;
	}

	// current pull request is merged
	if (codeReviewStatus === CodeReviewState.MERGED) {
		return `by ${codeReview.creator} was merged ${relativeTimeTo(codeReview.mergeTime)}`;
	}

	// current pull is closed
	return `by ${codeReview.creator} was closed ${relativeTimeTo(codeReview.closeTime)}`;
};

export interface CodeReviewTreeItem extends vscode.TreeItem {
	codeReview: adapterTypes.CodeReview;
}

const loadMoreCodeReviewItem: vscode.TreeItem = {
	label: 'Load more',
	tooltip: 'Load more pull requests',
	command: {
		title: 'Load more pull requests',
		command: 'github1s.pull-view-load-more-pulls',
		tooltip: 'Load more pull requests',
	},
};

export class CodeReviewTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewType = 'github1s.views.code-review-list';

	private forceUpdate = false;
	private _onDidChangeTreeData = new vscode.EventEmitter<undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private async _resolveDataSource() {
		return platformAdapterManager.getCurrentAdapter().resolveDataSource();
	}

	public updateTree(forceUpdate = true) {
		this.forceUpdate = forceUpdate;
		this._onDidChangeTreeData.fire(undefined);
	}

	async getCodeReviewItems(): Promise<vscode.TreeItem[]> {
		const currentAdapter = platformAdapterManager.getCurrentAdapter();
		const dataSource = await currentAdapter.resolveDataSource();
		const routerState = await router.getState();
		const codeReviews = await dataSource.provideCodeReviews(routerState.repo, { page: 1, pageSize: 100 });
		this.forceUpdate = false;
		const codeReviewTreeItems = codeReviews.map((codeReview) => {
			const label = getPullTreeItemLabel(codeReview);
			const description = getPullTreeItemDescription(codeReview);
			const tooltip = `${label} (${description})`;
			const iconPath = vscode.Uri.parse(dataSource.provideUserAvatarLink(codeReview.creator));
			const contextValue = 'github1s:pull-request';

			return {
				codeReview,
				label,
				iconPath,
				description,
				tooltip,
				contextValue,
				resourceUri: vscode.Uri.parse('').with({
					scheme: GitHub1sSourceControlDecorationProvider.codeReviewSchema,
					query: queryString.stringify({ id: codeReview.id }),
				}),
				collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
			};
		});
		return codeReviews.length >= 100 ? [...codeReviewTreeItems, loadMoreCodeReviewItem] : codeReviewTreeItems;
	}

	async getPullFileItems(codeReview: adapterTypes.CodeReview): Promise<vscode.TreeItem[]> {
		const changedFiles = await getPullChangedFiles(codeReview);

		return changedFiles.map((changedFile) => {
			const filePath = changedFile.headFileUri.path;
			const id = `${pull.number} ${filePath}`;
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
			return this.getPullItems();
		}
		const pull = (element as PullTreeItem)?.pull;
		return pull ? this.getPullFileItems(pull) : [];
	}

	// the tooltip of the `PullTreeItem` with `resourceUri` property won't show
	// correctly if miss this resolveTreeItem, it seems a bug of current version
	// vscode, and it has fixed in a newer version vscode
	resolveTreeItem(item: vscode.TreeItem, _element: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
		return item;
	}
}
