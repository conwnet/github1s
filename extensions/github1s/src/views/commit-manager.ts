/**
 * @file Commit Manager
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
import { ChangedFile, Commit } from '@/adapters/types';
import { adapterManager } from '@/adapters';

// manage changed files for a commit
class CommitChangedFilesManager {
	private static instancesMap = new Map<string, CommitChangedFilesManager>();

	private _scheme = '';
	private _repo = '';
	private _commitSha = '';
	private _pageSize = 100;
	private _currentPage = 1; // page is begin from 1
	private _hasMore = true;
	private _changedFilesList: ChangedFile[] | null = null;

	public static getInstance(scheme: string, repo: string, commitSha: string) {
		const mapKey = `${scheme} ${repo} ${commitSha}`;
		if (!CommitChangedFilesManager.instancesMap.has(mapKey)) {
			const manager = new CommitChangedFilesManager(scheme, repo, commitSha);
			CommitChangedFilesManager.instancesMap.set(mapKey, manager);
		}
		return CommitChangedFilesManager.instancesMap.get(mapKey)!;
	}

	constructor(scheme: string, repo: string, commitSha: string) {
		this._scheme = scheme;
		this._repo = repo;
		this._commitSha = commitSha;
	}

	getList = reuseable(
		async (forceUpdate: boolean = false): Promise<ChangedFile[]> => {
			if (forceUpdate || !this._changedFilesList) {
				this._changedFilesList = [];
				this._currentPage = 1;
				await this.loadMore();
			}
			return this._changedFilesList;
		}
	);

	loadMore = reuseable(
		async (): Promise<ChangedFile[]> => {
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const changedFiles = await dataSource.provideCommitChangedFiles(this._repo, this._commitSha, {
				pageSize: this._pageSize,
				page: this._currentPage,
			});

			this._currentPage += 1;
			this._hasMore = changedFiles.length === this._pageSize;
			(this._changedFilesList || (this._changedFilesList = [])).push(...changedFiles);

			return changedFiles;
		}
	);

	hasMore = reuseable(async () => {
		return this._hasMore;
	});

	async setChangedFiles(files: ChangedFile[]) {
		this._changedFilesList = files;
		this._hasMore = false;
	}
}

// maintain the previous/next relation for file commits
// if the filePath is '', it means this is the commits relation for repository
// if the previous/next is null, it means we met the end node
type CommitRelation = {
	filePathPreviousMap: Map<string, string | null>; // filePath -> commitSha/null
	filePathNextMap: Map<string, string | null>; // filePath -> commitSha/null
};

export class CommitManager {
	private static instancesMap = new Map<string, CommitManager>();

	private _scheme = '';
	private _repo = '';
	private _commitMap = new Map<string, Commit>(); // ref -> CommitWithDirection
	private _relationMap = new Map<string, CommitRelation>(); // commitSha -> CommitRelation
	private _pageSize = 100;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!CommitManager.instancesMap.has(mapKey)) {
			CommitManager.instancesMap.set(mapKey, new CommitManager(scheme, repo));
		}
		return CommitManager.instancesMap.get(mapKey)!;
	}

	private constructor(scheme: string, repo: string) {
		this._scheme = scheme;
		this._repo = repo;
	}

	// link two commitSha
	private linkCommitShas(filePath: string, previousCommitSha: string | null, nextCommitSha: string | null) {
		if (previousCommitSha) {
			if (!this._relationMap.has(previousCommitSha)) {
				this._relationMap.set(previousCommitSha, {
					filePathPreviousMap: new Map<string, string | null>(),
					filePathNextMap: new Map<string, string | null>(),
				});
			}
			this._relationMap.get(previousCommitSha)!.filePathNextMap.set(filePath, nextCommitSha);
		}
		if (nextCommitSha) {
			if (!this._relationMap.has(nextCommitSha)) {
				this._relationMap.set(nextCommitSha, {
					filePathPreviousMap: new Map<string, string | null>(),
					filePathNextMap: new Map<string, string | null>(),
				});
			}
			this._relationMap.get(nextCommitSha)!.filePathPreviousMap.set(filePath, previousCommitSha);
		}
	}

	// construct commit list with commit relations
	private resolveCommitList(ref: string, filePath: string) {
		const commitList: Commit[] = [];
		let currentRef: string | undefined | null = ref;
		while (currentRef && this._commitMap.has(currentRef)) {
			const commit = this._commitMap.get(currentRef)!;
			commitList.push(commit);
			currentRef = this._relationMap.get(commit.sha)?.filePathPreviousMap.get(filePath)!;
		}
		return commitList;
	}

	getList = reuseable(
		async (ref: string = 'HEAD', filePath: string = '', forceUpdate: boolean = false): Promise<Commit[]> => {
			const hasMore = await this.hasMore(ref, filePath);
			const commitList = this.resolveCommitList(ref, filePath);
			const neverLoadMore = hasMore && commitList.length < this._pageSize;
			if (forceUpdate || neverLoadMore) {
				await this.loadMore(ref, filePath);
			}
			return this.resolveCommitList(ref, filePath);
		}
	);

	getItem = reuseable(
		async (ref: string, forceUpdate: boolean = false): Promise<Commit | null> => {
			if (forceUpdate || !this._commitMap.has(ref)) {
				const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
				const commit = await dataSource.provideCommit(this._repo, ref);
				// also map `ref` to this commit
				commit && this._commitMap.set(ref, commit);
				commit && this._commitMap.set(commit.sha, commit);
				if (commit?.files) {
					const manager = CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha);
					manager.setChangedFiles(commit.files);
				}
			}
			return this._commitMap.get(ref)!;
		}
	);

	loadMore = reuseable(
		async (ref: string = 'HEAD', filePath: string = ''): Promise<Commit[]> => {
			const commitList = this.resolveCommitList(ref, filePath);
			const latestRef = commitList?.[commitList.length - 1]?.sha || ref;
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const queryOptions = { pageSize: this._pageSize, page: 1, from: latestRef, path: filePath };
			const commits = await dataSource.provideCommits(this._repo, queryOptions);

			// also map `ref` to the first commit
			commits.length && this._commitMap.set(ref, commits[0]);
			commits.forEach((commit) => {
				this._commitMap.set(commit.sha, commit);
				// directly set changed files if they are in response
				if (commit?.files) {
					const manager = CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha);
					manager.setChangedFiles(commit.files);
				}
			});
			for (let i = 1, len = commits.length; i < len; i++) {
				const previousCommitSha = commits[i].sha;
				const nextCommitSha = commits[i - 1].sha;
				this.linkCommitShas(filePath, previousCommitSha, nextCommitSha);
			}
			// if has more commits
			const hasMore = commits.length === this._pageSize;
			if (commits.length && !hasMore) {
				this.linkCommitShas(filePath, null, commits[commits.length - 1].sha);
			}
			return commits;
		}
	);

	hasMore = reuseable(
		async (ref: string = 'HEAD', filePath: string = ''): Promise<boolean> => {
			const commitList = this.resolveCommitList(ref, filePath);
			const relation = commitList.length ? this._relationMap.get(commitList[commitList.length - 1].sha) : null;
			return !relation || relation.filePathPreviousMap.get(filePath) !== null;
		}
	);

	public getChangedFiles = reuseable(
		async (ref: string, forceUpdate: boolean = false): Promise<ChangedFile[]> => {
			const commit = this._commitMap.has(ref) ? this._commitMap.get(ref) : await this.getItem(ref);
			const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
			return manager ? manager.getList(forceUpdate) : [];
		}
	);

	public loadMoreChangedFiles = reuseable(
		async (ref: string): Promise<ChangedFile[]> => {
			const commit = this._commitMap.has(ref) ? this._commitMap.get(ref) : await this.getItem(ref);
			const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
			return manager ? manager.loadMore() : [];
		}
	);

	public hasMoreChangedFiles = reuseable(
		async (ref: string): Promise<boolean> => {
			const commit = this._commitMap.has(ref) ? this._commitMap.get(ref) : await this.getItem(ref);
			const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
			return manager ? manager.hasMore() : false;
		}
	);

	// get the lastest commit of `file with modifications`,
	// the commit of `ref` in arguments could be newer than result
	public getFileLatestCommit = reuseable(
		async (ref: string, filePath: string): Promise<Commit | null> => {
			const refCommit = this._commitMap.has(ref) ? this._commitMap.get(ref) : null;
			// if the `filePath` is occurred in `_relationMap`, the latest commit of this file is refCommit
			if (refCommit && this._relationMap.get(refCommit.sha)?.filePathPreviousMap?.has(filePath)) {
				return refCommit;
			}
			return (await this.loadMore(ref, filePath))[0] || null;
		}
	);

	public getPreviousCommit = reuseable(
		async (ref: string = 'HEAD', filePath: string = ''): Promise<Commit | null> => {
			const commit = this._commitMap.has(ref) ? this._commitMap.get(ref) : await this.getItem(ref);
			const relation = commit ? this._relationMap.get(commit.sha) : null;

			if (relation && relation.filePathPreviousMap.get(filePath) === null) {
				return null;
			}
			if (!relation || !relation.filePathPreviousMap.has(filePath)) {
				await this.loadMore(ref, filePath);
			}
			const previousCommitSha = relation ? relation.filePathPreviousMap.get(filePath) : null;
			return previousCommitSha ? this._commitMap.get(previousCommitSha) || null : null;
		}
	);

	public getNextCommit = reuseable(
		async (ref: string = 'HEAD', filePath: string = ''): Promise<Commit | null> => {
			const commit = this._commitMap.has(ref) ? this._commitMap.get(ref) : await this.getItem(ref);
			const relation = commit ? this._relationMap.get(commit.sha) : null;
			const nextCommitSha = relation ? relation.filePathNextMap.get(filePath) : null;
			return nextCommitSha ? this._commitMap.get(nextCommitSha) || null : null;
		}
	);
}
