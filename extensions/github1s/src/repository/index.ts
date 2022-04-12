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
	private _commitManager: CommitManager;
	private _codeReviewManager: CodeReviewManager;
	private _blameRangesCache: Map<string, BlameRange[]>;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!Repository.instanceMap.has(mapKey)) {
			Repository.instanceMap.set(mapKey, new Repository(scheme, repo));
		}
		return Repository.instanceMap.get(mapKey)!;
	}

	private constructor(private _scheme: string, private _repo: string) {
		this._branchTagManager = BranchTagManager.getInstance(_scheme, _repo);
		this._commitManager = CommitManager.getInstance(_scheme, _repo);
		this._codeReviewManager = CodeReviewManager.getInstance(_scheme, _repo);
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

	getCommitList(...args: Parameters<CommitManager['getList']>) {
		return this._commitManager.getList(...args);
	}

	getCommitItem(...args: Parameters<CommitManager['getItem']>) {
		return this._commitManager.getItem(...args);
	}

	loadMoreCommits(...args: Parameters<CommitManager['loadMore']>) {
		return this._commitManager.loadMore(...args);
	}

	hasMoreCommits(...args: Parameters<CommitManager['hasMore']>) {
		return this._commitManager.hasMore(...args);
	}

	getCommitChangedFiles(...args: Parameters<CommitManager['getChangedFiles']>) {
		return this._commitManager.getChangedFiles(...args);
	}

	loadMoreCommitChangedFiles(...args: Parameters<CommitManager['loadMoreChangedFiles']>) {
		return this._commitManager.loadMoreChangedFiles(...args);
	}

	hasMoreCommitChangedFiles(...args: Parameters<CommitManager['hasMoreChangedFiles']>) {
		return this._commitManager.hasMoreChangedFiles(...args);
	}

	getFileLatestCommit(...args: Parameters<CommitManager['getFileLatestCommit']>) {
		return this._commitManager.getFileLatestCommit(...args);
	}

	getPreviousCommit(...args: Parameters<CommitManager['getPreviousCommit']>) {
		return this._commitManager.getPreviousCommit(...args);
	}

	getNextCommit(...args: Parameters<CommitManager['getNextCommit']>) {
		return this._commitManager.getNextCommit(...args);
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

	async getFileBlame(ref: string, path: string) {
		const cacheKey = `${ref} ${path}`;
		if (!this._blameRangesCache.has(cacheKey)) {
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const blameRanges = await dataSource.provideBlameRanges(this._repo, ref, path);
			this._blameRangesCache.set(cacheKey, blameRanges);
		}
		return this._blameRangesCache.get(cacheKey);
	}
}
