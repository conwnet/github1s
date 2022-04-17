/**
 * @file Code Review List View
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import router from '@/router';
import { Barrier } from '@/helpers/async';
import { Repository } from '@/repository';
import { relativeTimeTo } from '@/helpers/date';
import adapterManager from '@/adapters/manager';
import * as adapterTypes from '@/adapters/types';
import { getChangedFileDiffCommand, getCodeReviewChangedFiles } from '@/changes/files';
import { GitHub1sSourceControlDecorationProvider } from '@/providers/decorations/source-control';

enum CodeReviewState {
	OPEN = 'open',
	CLOSED = 'closed',
	MERGED = 'merged',
}

const getCodeReviewStatus = (codeReview: adapterTypes.CodeReview): CodeReviewState => {
	// current codeReview request is open
	if (codeReview.state === adapterTypes.CodeReviewState.Open) {
		return CodeReviewState.OPEN;
	}

	// current codeReview request is merged
	if (codeReview.state === adapterTypes.CodeReviewState.Merged) {
		return CodeReviewState.MERGED;
	}

	// current codeReview is closed
	return CodeReviewState.CLOSED;
};

const statusIconMap = {
	[CodeReviewState.OPEN]: '🟢',
	[CodeReviewState.CLOSED]: '🔴',
	[CodeReviewState.MERGED]: '🟣',
};

export const getCodeReviewTreeItemLabel = (codeReview: adapterTypes.CodeReview) => {
	const statusIcon = statusIconMap[getCodeReviewStatus(codeReview)];
	return `${statusIcon} #${codeReview.id} ${codeReview.title}`;
};

export const getCodeReviewTreeItemDescription = (codeReview: adapterTypes.CodeReview) => {
	const codeReviewStatus = getCodeReviewStatus(codeReview);

	// current codeReview request is open
	if (codeReviewStatus === CodeReviewState.OPEN) {
		return `opened ${relativeTimeTo(codeReview.createTime)} by ${codeReview.creator}`;
	}

	// current codeReview request is merged
	if (codeReviewStatus === CodeReviewState.MERGED) {
		return `by ${codeReview.creator} was merged ${relativeTimeTo(codeReview.mergeTime!)}`;
	}

	// current codeReview is closed
	return `by ${codeReview.creator} was closed ${relativeTimeTo(codeReview.closeTime!)}`;
};

export interface CodeReviewTreeItem extends vscode.TreeItem {
	codeReview: adapterTypes.CodeReview;
}

const loadMoreCodeReviewsItem: vscode.TreeItem = {
	label: 'Load more',
	tooltip: 'Load more code reviews',
	command: {
		title: 'Load more code reviews',
		command: 'github1s.commands.load-more-code-reviews',
		tooltip: 'Load more code reviews',
	},
};

const createLoadMoreChangedFilesItem = (codeReviewId: string): vscode.TreeItem => ({
	label: 'Load more',
	tooltip: 'Load more changed files',
	command: {
		title: 'Load more changed files',
		command: 'github1s.commands.load-more-code-review-changed-files',
		tooltip: 'Load more changed files',
		arguments: [codeReviewId],
	},
});

export class CodeReviewTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewType = 'github1s.views.codeReviewList';

	private _forceUpdate = false;
	private _loadingBarrier: Barrier | null = null;
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	public updateTree(forceUpdate = true) {
		this._forceUpdate = forceUpdate;
		this._onDidChangeTreeData.fire();
	}

	public async loadMoreCodeReviews() {
		if (!this._loadingBarrier || this._loadingBarrier.isOpen()) {
			this._loadingBarrier = new Barrier(5000);
			this.updateTree(false);
			const scheme = adapterManager.getCurrentScheme();
			const { repo } = await router.getState();
			await Repository.getInstance(scheme, repo).loadMoreCodeReviews();
			this._loadingBarrier.open();
		}
	}

	public async loadMoreChangedFiles(codeReviewId: string) {
		if (!this._loadingBarrier || this._loadingBarrier.isOpen()) {
			this._loadingBarrier = new Barrier(5000);
			this.updateTree(false);
			const scheme = adapterManager.getCurrentScheme();
			const { repo } = await router.getState();
			await Repository.getInstance(scheme, repo).loadMoreCodeReviewChangedFiles(codeReviewId);
			this._loadingBarrier.open();
		}
	}

	async getCodeReviewItems(): Promise<vscode.TreeItem[]> {
		this._loadingBarrier && (await this._loadingBarrier.wait());
		const currentScheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();
		const repository = Repository.getInstance(currentScheme, repo);
		const codeReviews = await repository.getCodeReviewList(this._forceUpdate);
		const codeReviewTreeItems = codeReviews.map((codeReview) => {
			const label = getCodeReviewTreeItemLabel(codeReview);
			const description = getCodeReviewTreeItemDescription(codeReview);
			const tooltip = `${label} (${description})`;
			const iconPath = vscode.Uri.parse(codeReview?.avatarUrl || '');
			const contextValue = 'github1s:viewItems:codeReviewListItem';

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
		this._forceUpdate = false;
		const hasMore = await repository.hasMoreCodeReviews();
		return hasMore ? [...codeReviewTreeItems, loadMoreCodeReviewsItem] : codeReviewTreeItems;
	}

	async getCodeReviewFileItems(codeReview: adapterTypes.CodeReview): Promise<vscode.TreeItem[]> {
		this._loadingBarrier && (await this._loadingBarrier.wait());
		const changedFiles = await getCodeReviewChangedFiles(codeReview);
		const changedFileItems = changedFiles.map((changedFile) => {
			const filePath = changedFile.headFileUri.path;
			const id = `${codeReview.id} ${filePath}`;
			const command = getChangedFileDiffCommand(changedFile);

			return {
				id,
				command,
				description: true,
				resourceUri: changedFile.headFileUri.with({
					query: queryString.stringify({ changeStatus: changedFile.status }),
				}),
				collapsibleState: vscode.TreeItemCollapsibleState.None,
			};
		});
		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();
		const repository = Repository.getInstance(scheme, repo);
		const hasMore = await repository.hasMoreCodeReviewChangedFiles(codeReview.id);
		const loadMoreChangedFilesItem = createLoadMoreChangedFilesItem(codeReview.id);
		return hasMore ? [...changedFileItems, loadMoreChangedFilesItem] : changedFileItems;
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
		if (!element) {
			return this.getCodeReviewItems();
		}
		const codeReview = (element as CodeReviewTreeItem)?.codeReview;
		return codeReview ? this.getCodeReviewFileItems(codeReview) : [];
	}
}
