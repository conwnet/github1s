import * as vscode from 'vscode';
import queryString from 'query-string';
import { Commit, FileChangeStatus } from '@/adapters/types';
import { Repository } from '@/repository';
import router from '@/router';
import { getCommitChangedFiles } from './files';

// Expose commit history for the router's current repository and ref in the SCM graph.
export class GitHub1sHistoryProvider implements vscode.SourceControlHistoryProvider, vscode.Disposable {
	private static instance: GitHub1sHistoryProvider | null = null;
	// The SCM graph requires a current ref to initialize, but no commit is marked as current.
	currentHistoryItemRef: vscode.SourceControlHistoryItemRef | undefined;
	readonly currentHistoryItemRemoteRef = undefined;
	readonly currentHistoryItemBaseRef = undefined;

	private readonly currentRefsChanged = new vscode.EventEmitter<void>();
	readonly onDidChangeCurrentHistoryItemRefs = this.currentRefsChanged.event;
	private readonly refsChanged = new vscode.EventEmitter<vscode.SourceControlHistoryItemRefsChangeEvent>();
	readonly onDidChangeHistoryItemRefs = this.refsChanged.event;

	private constructor() {}

	public static getInstance(): GitHub1sHistoryProvider {
		if (!GitHub1sHistoryProvider.instance) {
			GitHub1sHistoryProvider.instance = new GitHub1sHistoryProvider();
		}
		return GitHub1sHistoryProvider.instance;
	}

	refresh() {
		const { repo, ref } = router.getState();
		const previousRef = this.currentHistoryItemRef;
		this.currentHistoryItemRef = repo ? { id: ref, name: ref } : undefined;
		this.currentRefsChanged.fire();
		// Repository navigation can keep the same branch name (for example, "main").
		// Explicitly mark the ref as modified so the graph reloads even when its ID is unchanged.
		if (previousRef?.id === this.currentHistoryItemRef?.id) {
			this.refsChanged.fire({
				added: [],
				removed: [],
				modified: this.currentHistoryItemRef ? [this.currentHistoryItemRef] : [],
				silent: false,
			});
		}
	}

	// Release event emitters and invalidate pending history requests.
	dispose() {
		this.currentHistoryItemRef = undefined;
		this.currentRefsChanged.dispose();
		this.refsChanged.dispose();
	}

	// List refs for the SCM graph's reference picker and filters,
	// optionally restricted by ID. Only the router's current ref is exposed.
	provideHistoryItemRefs(ids: string[] | undefined): vscode.SourceControlHistoryItemRef[] {
		const ref = this.currentHistoryItemRef;
		return ref && (!ids || ids.includes(ref.id)) ? [ref] : [];
	}

	// Return a page of commits for the SCM graph using the current router ref.
	async provideHistoryItems(options: vscode.SourceControlHistoryOptions, token: vscode.CancellationToken) {
		const currentRef = this.currentHistoryItemRef;
		if (!currentRef || token.isCancellationRequested) {
			return [];
		}

		const commits = await this.getCommitPage(currentRef, options, token);
		// Refresh replaces the ref object, so identity also detects navigation to the same ref name.
		// Discard results from requests that no longer belong to the current history view.
		if (!commits || token.isCancellationRequested || currentRef !== this.currentHistoryItemRef) {
			return [];
		}

		return commits.map((commit) => this.toHistoryItem(commit));
	}

	private async getCommitPage(
		ref: vscode.SourceControlHistoryItemRef,
		{ skip = 0, limit = 50 }: vscode.SourceControlHistoryOptions,
		token: vscode.CancellationToken,
	): Promise<Commit[] | undefined> {
		const repository = Repository.getCurrentInstance();
		let commits = await repository.getCommitList(ref.id);
		if (token.isCancellationRequested || ref !== this.currentHistoryItemRef) {
			return undefined;
		}

		// Reuse cached history and load at most one more page when it has been consumed.
		if (skip > 0 && skip >= commits.length) {
			await repository.loadMoreCommits(ref.id);
			commits = await repository.getCommitList(ref.id);
		}
		// Commit-ID limits are not resolved here; use the default page size for that form.
		const count = typeof limit === 'number' ? Math.max(0, limit) : 50;
		return commits.slice(skip, skip + count);
	}

	// Resolve a single commit by ID, independently of the currently loaded history pages.
	async resolveHistoryItem(id: string) {
		const commit = await Repository.getCurrentInstance().getCommitItem(id);
		return commit ? this.toHistoryItem(commit) : undefined;
	}

	// Provide changed files and before/after URIs for a commit's diff view.
	async provideHistoryItemChanges(id: string, parentId: string | undefined) {
		const commit = await Repository.getCurrentInstance().getCommitItem(id);
		if (!commit) {
			return [];
		}
		// Changed files are computed against the first parent, including for merge commits.
		// Reject other parents or ranges to avoid displaying a diff against the wrong base.
		if (parentId !== commit.parents[0]) {
			throw new Error("Only changes against a commit's first parent are supported.");
		}
		const files = await getCommitChangedFiles(commit);
		return files.map((file) => ({
			// The decoration provider reads changeStatus from the resource URI.
			uri: file.headFileUri.with({ query: queryString.stringify({ changeStatus: file.status }) }),
			// Root commits and added files have no original content; removed files have no modified content.
			originalUri: !parentId || file.status === FileChangeStatus.Added ? undefined : file.baseFileUri,
			modifiedUri: file.status === FileChangeStatus.Removed ? undefined : file.headFileUri,
		}));
	}

	// Find the common ancestor of the requested refs for comparisons; unsupported here.
	resolveHistoryItemRefsCommonAncestor = () => undefined;
	// Provide commit context for chat requests; unsupported here.
	resolveHistoryItemChatContext = () => undefined;
	// Provide file-change context between two commits for chat requests; unsupported here.
	resolveHistoryItemChangeRangeChatContext = () => undefined;

	private toHistoryItem(commit: Commit): vscode.SourceControlHistoryItem {
		return {
			id: commit.sha,
			parentIds: commit.parents,
			subject: commit.message.split('\n')[0],
			message: commit.message,
			displayId: commit.sha.slice(0, 7),
			author: commit.author,
			authorEmail: commit.email,
			authorIcon: commit.avatarUrl ? vscode.Uri.parse(commit.avatarUrl) : undefined,
			timestamp: commit.createTime?.getTime(),
		};
	}
}
