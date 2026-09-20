/**
 * @file Current GitHub Repository
 * @author netcon
 */

import router from '@/router';
import { getAdapter } from '@/adapters';
import { CommitManager } from './commit-manager';
import { CodeReviewManager } from './code-review-manager';
import { BranchTagManager } from './branch-tag-manager';
import { BlameRange } from '@/adapters/types';

export class Repository {
	private static instanceMap = new Map<string, Repository>();

	private _branchTagManager: BranchTagManager;
	private _codeReviewManager: CodeReviewManager;
	private _commitManager: CommitManager;
	private _blameRangesCache: Map<string, BlameRange[]>;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!Repository.instanceMap.has(mapKey)) {
			Repository.instanceMap.set(mapKey, new Repository(scheme, repo));
		}
		return Repository.instanceMap.get(mapKey)!;
	}

	public static getCurrentInstance() {
		return Repository.getInstance(getAdapter().scheme, router.getState().repo);
	}

	private constructor(
		public readonly scheme: string,
		public readonly repo: string,
	) {
		this._branchTagManager = BranchTagManager.getInstance(scheme, repo);
		this._codeReviewManager = CodeReviewManager.getInstance(scheme, repo);
		this._commitManager = CommitManager.getInstance(scheme, repo);
		this._blameRangesCache = new Map<string, BlameRange[]>();
	}

	getBranchList(...args: Parameters<BranchTagManager['getBranchList']>) {
		return this._branchTagManager.getBranchList(...args);
	}

	getBranchItem(...args: Parameters<BranchTagManager['getBranchItem']>) {
		return this._branchTagManager.getBranchItem(...args);
	}

	loadMoreBranches(...args: Parameters<BranchTagManager['loadMoreBranches']>) {
		return this._branchTagManager.loadMoreBranches(...args);
	}

	hasMoreBranches(...args: Parameters<BranchTagManager['hasMoreBranches']>) {
		return this._branchTagManager.hasMoreBranches(...args);
	}

	getTagList(...args: Parameters<BranchTagManager['getTagList']>) {
		return this._branchTagManager.getTagList(...args);
	}

	getTagItem(...args: Parameters<BranchTagManager['getTagItem']>) {
		return this._branchTagManager.getTagItem(...args);
	}

	loadMoreTags(...args: Parameters<BranchTagManager['loadMoreTags']>) {
		return this._branchTagManager.loadMoreTags(...args);
	}

	hasMoreTags(...args: Parameters<BranchTagManager['hasMoreTags']>) {
		return this._branchTagManager.hasMoreTags(...args);
	}

	getCommitList(ref: string = 'HEAD', filePath: string = '/', forceUpdate: boolean = false) {
		return this._commitManager.getList(ref, filePath, forceUpdate);
	}

	getCommitItem(ref: string, forceUpdate: boolean = false) {
		return this._commitManager.getItem(ref, forceUpdate);
	}

	loadMoreCommits(ref: string = 'HEAD', filePath: string = '/') {
		return this._commitManager.loadMore(ref, filePath);
	}

	hasMoreCommits(ref: string = 'HEAD', filePath: string = '/') {
		return this._commitManager.hasMore(ref, filePath);
	}

	getCommitChangedFiles(ref: string, forceUpdate: boolean = false) {
		return this._commitManager.getChangedFiles(ref, forceUpdate);
	}

	loadMoreCommitChangedFiles(ref: string) {
		return this._commitManager.loadMoreChangedFiles(ref);
	}

	hasMoreCommitChangedFiles(ref: string) {
		return this._commitManager.hasMoreChangedFiles(ref);
	}

	getFileLatestCommit(ref: string, filePath: string) {
		return this._commitManager.getLatestCommit(ref, filePath);
	}

	getPreviousCommit(sha: string, filePath: string, fromSha: string) {
		return this._commitManager.getPreviousCommit(sha, filePath, fromSha);
	}

	getNextCommit(sha: string, filePath: string, fromSha: string) {
		return this._commitManager.getNextCommit(sha, filePath, fromSha);
	}

	getCodeReviewList(...args: Parameters<CodeReviewManager['getList']>) {
		return this._codeReviewManager.getList(...args);
	}

	getCodeReviewItem(...args: Parameters<CodeReviewManager['getItem']>) {
		return this._codeReviewManager.getItem(...args);
	}

	loadMoreCodeReviews(...args: Parameters<CodeReviewManager['loadMore']>) {
		return this._codeReviewManager.loadMore(...args);
	}

	hasMoreCodeReviews(...args: Parameters<CodeReviewManager['hasMore']>) {
		return this._codeReviewManager.hasMore(...args);
	}

	getCodeReviewChangedFiles(...args: Parameters<CodeReviewManager['getChangedFiles']>) {
		return this._codeReviewManager.getChangedFiles(...args);
	}

	loadMoreCodeReviewChangedFiles(...args: Parameters<CodeReviewManager['loadMoreChangedFiles']>) {
		return this._codeReviewManager.loadMoreChangedFiles(...args);
	}

	hasMoreCodeReviewChangedFiles(...args: Parameters<CodeReviewManager['hasMoreChangedFiles']>) {
		return this._codeReviewManager.hasMoreChangedFiles(...args);
	}

	async getFileBlameRanges(ref: string, path: string) {
		const cacheKey = `${ref} ${path}`;
		if (!this._blameRangesCache.has(cacheKey)) {
			const dataSource = await getAdapter(this.scheme).resolveDataSource();
			const blameRanges = await dataSource.provideFileBlameRanges(this.repo, ref, path);
			this._blameRangesCache.set(cacheKey, blameRanges);
		}
		return this._blameRangesCache.get(cacheKey) || [];
	}
}
