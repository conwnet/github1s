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

	constructor(
		private _scheme: string,
		private _repo: string,
		private _commitSha: string,
	) {}

	getList = reuseable(async (forceUpdate: boolean = false): Promise<ChangedFile[]> => {
		if (forceUpdate || !this._changedFilesList) {
			this._currentPage = 1;
			this._changedFilesList = [];
			await this.loadMore();
		}
		return this._changedFilesList;
	});

	loadMore = reuseable(async (): Promise<ChangedFile[]> => {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const changedFiles = await dataSource.provideCommitChangedFiles(this._repo, this._commitSha, {
			pageSize: this._pageSize,
			page: this._currentPage,
		});

		this._currentPage += 1;
		this._hasMore = changedFiles.length === this._pageSize;
		(this._changedFilesList || (this._changedFilesList = [])).push(...changedFiles);

		return changedFiles;
	});

	hasMore = reuseable(async () => {
		return this._hasMore;
	});

	async setChangedFiles(files: ChangedFile[]) {
		this._changedFilesList = files;
		this._hasMore = false;
	}
}

export class CommitManager {
	private static instancesMap = new Map<string, CommitManager>();
	private static _commitMap = new Map<string, Commit>(); // commitSha -> CommitWithDirection
	// if `previous` or `next` is null, it means this is an end node
	private static _relationMap = new Map<string, Map<string, { previous?: string | null; next?: string | null }>>();

	private _latestCommitSha: string | null = null;
	private _currentPage = 1;
	private _pageSize = 100;

	public static getInstance(scheme: string, repo: string, from: string, filePath: string) {
		const mapKey = `${scheme} ${repo} ${from} ${filePath}`;
		if (!CommitManager.instancesMap.has(mapKey)) {
			CommitManager.instancesMap.set(mapKey, new CommitManager(scheme, repo, from, filePath));
		}
		return CommitManager.instancesMap.get(mapKey)!;
	}

	private constructor(
		private _scheme: string,
		private _repo: string,
		private _from: string,
		private _filePath: string,
	) {}

	// link two commitSha
	private linkCommitShas(previousCommitSha: string | null, nextCommitSha: string | null) {
		if (!CommitManager._relationMap.has(this._filePath)) {
			CommitManager._relationMap.set(this._filePath, new Map());
		}
		const relation = CommitManager._relationMap.get(this._filePath)!;
		if (previousCommitSha) {
			!relation.has(previousCommitSha) && relation.set(previousCommitSha, {});
			relation.get(previousCommitSha)!.next = nextCommitSha;
		}
		if (nextCommitSha) {
			!relation.has(nextCommitSha) && relation.set(nextCommitSha, {});
			relation.get(nextCommitSha)!.previous = previousCommitSha;
		}
	}

	// construct commit list with commit relations
	private resolveCommitList() {
		const commitList: Commit[] = [];
		const relation = CommitManager._relationMap.get(this._filePath);
		let currentCommitSha: string | undefined | null = this._latestCommitSha;
		while (currentCommitSha && CommitManager._commitMap.has(currentCommitSha)) {
			const commit = CommitManager._commitMap.get(currentCommitSha)!;
			commitList.push(commit);
			currentCommitSha = relation?.get(commit.sha)?.previous;
		}
		return commitList;
	}

	getList = reuseable(async (forceUpdate: boolean = false): Promise<Commit[]> => {
		const hasMore = await this.hasMore();
		const commitList = this.resolveCommitList();
		const shouldLoadMore = hasMore && commitList.length < this._pageSize;

		if (forceUpdate || shouldLoadMore) {
			this._currentPage = 1;
			this._latestCommitSha = null;
			CommitManager._relationMap.set(this._filePath, new Map());
			await this.loadMore();
		}
		return this.resolveCommitList();
	});

	getItem = reuseable(async (forceUpdate: boolean = false): Promise<Commit | null> => {
		if (forceUpdate || !CommitManager._commitMap.has(this._from)) {
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const commit = await dataSource.provideCommit(this._repo, this._from);

			commit && CommitManager._commitMap.set(this._from, commit);
			commit && CommitManager._commitMap.set(commit.sha, commit);
			if (commit?.files) {
				const manager = CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha);
				manager.setChangedFiles(commit.files);
			}
		}
		return CommitManager._commitMap.get(this._from)!;
	});

	loadMore = reuseable(async (): Promise<Commit[]> => {
		const commitList = this.resolveCommitList();
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const queryOptions = {
			page: this._currentPage,
			pageSize: this._pageSize,
			from: this._from,
			path: this._filePath,
		};
		const commits = await dataSource.provideCommits(this._repo, queryOptions);

		if (this._currentPage === 1 && commits.length) {
			this._latestCommitSha = commits[0].sha;
			// also map `this._from` to the first commit if currentPage is 1 and filePath is empty
			!this._filePath && CommitManager._commitMap.set(this._from, commits[0]);
		}
		commits.forEach((commit) => {
			CommitManager._commitMap.set(commit.sha, commit);
			// directly set changed files if they are in response
			if (commit?.files) {
				const manager = CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha);
				manager.setChangedFiles(commit.files);
			}
		});
		if (this._currentPage > 1 && commitList.length && commits.length) {
			this.linkCommitShas(commits[0].sha, commitList[commitList.length - 1].sha);
		}
		for (let i = 1, len = commits.length; i < len; i++) {
			const previousCommitSha = commits[i].sha;
			const nextCommitSha = commits[i - 1].sha;
			this.linkCommitShas(previousCommitSha, nextCommitSha);
		}
		// if has more commits
		const hasMore = commits.length === this._pageSize;
		if (!hasMore) {
			const latestCommit = commits.length ? commits[commits.length - 1] : commitList[commitList.length - 1];
			this.linkCommitShas(null, latestCommit.sha);
		}
		this._currentPage += 1;
		return commits;
	});

	hasMore = reuseable(async (): Promise<boolean> => {
		const commitList = this.resolveCommitList();
		const relation = CommitManager._relationMap.get(this._filePath);
		const commitRelation = commitList.length ? relation?.get(commitList[commitList.length - 1].sha) : null;
		return !commitRelation || commitRelation.previous !== null;
	});

	public getChangedFiles = reuseable(async (forceUpdate: boolean = false): Promise<ChangedFile[]> => {
		const commit = await this.getItem();
		const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
		return manager ? manager.getList(forceUpdate) : [];
	});

	public loadMoreChangedFiles = reuseable(async (): Promise<ChangedFile[]> => {
		const commit = await this.getItem();
		const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
		return manager ? manager.loadMore() : [];
	});

	public hasMoreChangedFiles = reuseable(async (): Promise<boolean> => {
		const commit = await this.getItem();
		const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
		return manager ? manager.hasMore() : false;
	});

	// get the lastest commit of `file with modifications`,
	// the commit of `this._from` could be newer than result
	public getLatestCommit = reuseable(async (): Promise<Commit | null> => {
		const commit = this._latestCommitSha ? CommitManager._commitMap.get(this._latestCommitSha) : null;
		return commit || (await this.loadMore())[0] || null;
	});

	public getPreviousCommit = reuseable(async (): Promise<Commit | null> => {
		const commit = await this.getItem();
		const commitRelation = commit ? CommitManager._relationMap.get(this._filePath)?.get(commit.sha) : null;
		if (!commitRelation || commitRelation.previous === undefined) {
			return (await this.loadMore())[0] || null;
		}
		return (commitRelation.previous ? CommitManager._commitMap.get(commitRelation.previous) : null) || null;
	});

	public getNextCommit = reuseable(async (): Promise<Commit | null> => {
		const commit = await this.getItem();
		const commitRelation = commit ? CommitManager._relationMap.get(this._filePath)?.get(commit.sha) : null;
		const nextCommitSha = commitRelation ? commitRelation.next : null;
		return (nextCommitSha ? CommitManager._commitMap.get(nextCommitSha) : null) || null;
	});
}
