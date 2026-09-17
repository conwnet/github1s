import * as vscode from 'vscode';
import queryString from 'query-string';
import { Commit, FileChangeStatus } from '@/adapters/types';
import { Repository } from '@/repository';
import router from '@/router';
import { getCommitChangedFiles } from './files';

export class GitHub1sHistoryProvider implements vscode.SourceControlHistoryProvider, vscode.Disposable {
	// Current route ref, with its commit SHA filled in after the first page loads.
	currentHistoryItemRef: vscode.SourceControlHistoryItemRef | undefined;
	// This provider does not expose upstream or comparison-base refs.
	readonly currentHistoryItemRemoteRef = undefined;
	readonly currentHistoryItemBaseRef = undefined;

	// Tell VS Code to reread the current refs above.
	private readonly currentRefsChanged = new vscode.EventEmitter<void>();
	readonly onDidChangeCurrentHistoryItemRefs = this.currentRefsChanged.event;
	// Report ref changes so VS Code can refresh the graph, even when the ref ID is unchanged.
	private readonly refsChanged = new vscode.EventEmitter<vscode.SourceControlHistoryItemRefsChangeEvent>();
	readonly onDidChangeHistoryItemRefs = this.refsChanged.event;
	private readonly removeRouterListener = router.addListener((current, previous) => {
		if (current.repo !== previous.repo || current.ref !== previous.ref) {
			this.refresh();
		}
	});

	refresh() {
		const { repo, ref } = router.getState();
		const previousRef = this.currentHistoryItemRef;
		this.currentHistoryItemRef = repo ? { id: ref, name: ref, icon: new vscode.ThemeIcon('target') } : undefined;
		this.currentRefsChanged.fire();
		// Repository navigation can keep the same branch name (for example, "main").
		if (previousRef?.id === this.currentHistoryItemRef?.id) {
			this.refsChanged.fire({
				added: [],
				removed: [],
				modified: this.currentHistoryItemRef ? [this.currentHistoryItemRef] : [],
				silent: false,
			});
		}
	}

	provideHistoryItemRefs(ids: string[] | undefined): vscode.SourceControlHistoryItemRef[] {
		const ref = this.currentHistoryItemRef;
		return ref && (!ids || ids.includes(ref.id)) ? [ref] : [];
	}

	async provideHistoryItems(options: vscode.SourceControlHistoryOptions, token: vscode.CancellationToken) {
		const currentRef = this.currentHistoryItemRef;
		if (!currentRef || token.isCancellationRequested) {
			return [];
		}

		const repository = Repository.getCurrentInstance();
		const { ref } = router.getState();
		const skip = options.skip ?? 0;
		const limit = typeof options.limit === 'number' ? options.limit : 50;
		let commits = await repository.getCommitList(ref, '/', skip === 0);

		while (commits.length < skip + limit && (await repository.hasMoreCommits(ref))) {
			if (token.isCancellationRequested || currentRef !== this.currentHistoryItemRef) {
				return [];
			}
			await repository.loadMoreCommits(ref);
			commits = await repository.getCommitList(ref);
		}

		if (token.isCancellationRequested || currentRef !== this.currentHistoryItemRef) {
			return [];
		}

		if (skip === 0) {
			this.currentHistoryItemRef = { ...currentRef, revision: commits[0]?.sha };
			this.currentRefsChanged.fire();
		}
		return commits.slice(skip, skip + limit).map((commit) => this.toHistoryItem(commit));
	}

	async resolveHistoryItem(id: string) {
		const commit = await Repository.getCurrentInstance().getCommitItem(id);
		return commit ? this.toHistoryItem(commit) : undefined;
	}

	async provideHistoryItemChanges(id: string, parentId: string | undefined) {
		const commit = await Repository.getCurrentInstance().getCommitItem(id);
		if (!commit) {
			return [];
		}
		// The existing data source exposes individual commits, not arbitrary ranges.
		if (parentId !== commit.parents[0]) {
			throw new Error("Only changes against a commit's first parent are supported.");
		}
		const files = await getCommitChangedFiles(commit);
		return files.map((file) => {
			// A missing side makes VS Code open the existing file directly for additions/deletions.
			const originalUri = !parentId || file.status === FileChangeStatus.Added ? undefined : file.baseFileUri;
			const modifiedUri = file.status === FileChangeStatus.Removed ? undefined : file.headFileUri;
			return {
				// Display resource for the file label and status badge, including deleted files.
				uri: file.headFileUri.with({ query: queryString.stringify({ changeStatus: file.status }) }),
				// Content resources for the diff's left (before) and right (after) sides.
				originalUri,
				modifiedUri,
			};
		});
	}

	resolveHistoryItemRefsCommonAncestor(): undefined {
		return undefined;
	}

	resolveHistoryItemChatContext(): undefined {
		return undefined;
	}

	resolveHistoryItemChangeRangeChatContext(): undefined {
		return undefined;
	}

	private toHistoryItem(commit: Commit): vscode.SourceControlHistoryItem {
		return {
			id: commit.sha,
			// Parent IDs define the graph edges.
			parentIds: commit.parents,
			subject: commit.message.split('\n')[0],
			message: commit.message,
			displayId: commit.sha.slice(0, 7),
			author: commit.author,
			authorEmail: commit.email,
			authorIcon: commit.avatarUrl ? vscode.Uri.parse(commit.avatarUrl) : undefined,
			timestamp: commit.createTime?.getTime(),
			// Attach the current ref label to the commit it points to.
			references: this.currentHistoryItemRef?.revision === commit.sha ? [this.currentHistoryItemRef] : undefined,
		};
	}

	dispose() {
		this.removeRouterListener();
		this.currentRefsChanged.dispose();
		this.refsChanged.dispose();
	}
}
