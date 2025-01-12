/**
 * @file Current GitHub Repository
 * @author netcon
 */

import { adapterManager } from '@/adapters';
import { CommitManager } from './commit-manager';
import { CodeReviewManager } from './code-review-manager';
import { BranchTagManager } from './branch-tag-manager';
import { BlameRange } from '@/adapters/types';

export class Repository {
	private static instanceMap = new Map<string, Repository>();

	private _branchTagManager: BranchTagManager;
	private _codeReviewManager: CodeReviewManager;
	private _blameRangesCache: Map<string, BlameRange[]>;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!Repository.instanceMap.has(mapKey)) {
			Repository.instanceMap.set(mapKey, new Repository(scheme, repo));
		}
		return Repository.instanceMap.get(mapKey)!;
	}

	private constructor(
		private _scheme: string,
		private _repo: string,
	) {
		this._branchTagManager = BranchTagManager.getInstance(_scheme, _repo);
		this._codeReviewManager = CodeReviewManager.getInstance(_scheme, _repo);
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

	getCommitList(ref: string = 'HEAD', filePath: string = '', forceUpdate: boolean = false) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, filePath).getList(forceUpdate);
	}

	getCommitItem(ref: string, forceUpdate: boolean = false) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, '').getItem(forceUpdate);
	}

	loadMoreCommits(ref: string = 'HEAD', filePath: string = '') {
		return CommitManager.getInstance(this._scheme, this._repo, ref, filePath).loadMore();
	}

	hasMoreCommits(ref: string = 'HEAD', filePath: string = '') {
		return CommitManager.getInstance(this._scheme, this._repo, ref, filePath).hasMore();
	}

	getCommitChangedFiles(ref: string, forceUpdate: boolean = false) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, '').getChangedFiles(forceUpdate);
	}

	loadMoreCommitChangedFiles(ref: string) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, '').loadMoreChangedFiles();
	}

	hasMoreCommitChangedFiles(ref: string) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, '').hasMoreChangedFiles();
	}

	getFileLatestCommit(ref: string, filePath: string) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, filePath).getLatestCommit();
	}

	getPreviousCommit(ref: string, filePath: string) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, filePath).getPreviousCommit();
	}

	getNextCommit(ref: string, filePath: string) {
		return CommitManager.getInstance(this._scheme, this._repo, ref, filePath).getNextCommit();
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
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const blameRanges = await dataSource.provideFileBlameRanges(this._repo, ref, path);
			this._blameRangesCache.set(cacheKey, blameRanges);
		}
		return this._blameRangesCache.get(cacheKey) || [];
	}
}
