/**
 * @file Commit Manager
 * @author netcon
 */

import { getAdapter } from '@/adapters';
import { reuseable } from '@/helpers/func';
import { ChangedFile, Commit } from '@/adapters/types';

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
			this._changedFilesList = null;
			await this.loadMore();
		}
		return this._changedFilesList || [];
	});

	loadMore = reuseable(async (): Promise<ChangedFile[]> => {
		const dataSource = await getAdapter(this._scheme).resolveDataSource();
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

const historyKey = (from: string, filePath: string) => `${from} ${filePath}`;

export class CommitManager {
	private static instancesMap = new Map<string, CommitManager>();
	private _shaMap = new Map<string, Commit>(); // sha -> commit
	// historyKey -> [sha[], page, hasMore]
	private _historyMap = new Map<string, [string[], number, boolean]>();
	private _pageSize = 100;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!CommitManager.instancesMap.has(mapKey)) {
			CommitManager.instancesMap.set(mapKey, new CommitManager(scheme, repo));
		}
		return CommitManager.instancesMap.get(mapKey)!;
	}

	private constructor(
		private _scheme: string,
		private _repo: string,
	) {}

	private async fetchCommits(from: string, page: number, filePath: string): Promise<Commit[]> {
		const dataSource = await getAdapter(this._scheme).resolveDataSource();
		const commits = await dataSource.provideCommits(this._repo, {
			from,
			page,
			pageSize: this._pageSize,
			...(!filePath || filePath === '/' ? {} : { path: filePath }),
		});
		commits.forEach((commit) => this._shaMap.set(commit.sha, commit));
		return commits;
	}

	getList = reuseable(async (from: string, filePath: string, forceUpdate = false): Promise<Commit[]> => {
		let history = this._historyMap.get(historyKey(from, filePath));
		if (forceUpdate || !history) {
			const commits = await this.fetchCommits(from, 1, filePath);
			const hasMore = commits.length >= this._pageSize;
			history = [commits.map((commit) => commit.sha), 1, hasMore] as [string[], number, boolean];
			this._historyMap.set(historyKey(from, filePath), history);
			if (commits.length > 0 && from !== commits[0].sha) {
				// also cache the history for the latest commit sha, so that
				// we can get the history from the latest commit sha directly
				// Note when filePath is not empty, ref may not be history[0][0]
				this._historyMap.set(historyKey(commits[0].sha, filePath), history);
			}
		}
		return history[0].map((sha) => this._shaMap.get(sha)!).filter(Boolean);
	});

	getItem = reuseable(async (ref: string, forceUpdate = false): Promise<Commit | null> => {
		const sha = this._historyMap.get(historyKey(ref, '/'))?.[0]?.[0] || ref;
		let commit: Commit | null | undefined = this._shaMap.get(sha);
		if (forceUpdate || !commit) {
			const dataSource = await getAdapter(this._scheme).resolveDataSource();
			commit = await dataSource.provideCommit(this._repo, ref);
			commit && this._shaMap.set(commit.sha, commit);
		}
		return commit;
	});

	loadMore = reuseable(async (from: string, filePath: string): Promise<Commit[]> => {
		const key = historyKey(from, filePath);
		let history = this._historyMap.get(key);
		if (history && !history[2]) {
			// no more commits to load
			return Promise.resolve([]);
		}
		const fromSha = history?.[0]?.[0] || from;
		const nextPage = (history?.[1] || 0) + 1;
		const commits = await this.fetchCommits(fromSha, nextPage, filePath);
		// Ignore responses if a refresh replaced the history or another request already loaded this page.
		if (this._historyMap.get(key) !== history || (history && history[1] >= nextPage)) {
			return [];
		}
		history = history || ([[], 0, true] as [string[], number, boolean]);
		history[0].push(...commits.map((commit) => commit.sha));
		history[1] = nextPage;
		history[2] = commits.length >= this._pageSize;
		this._historyMap.set(key, history);
		return commits;
	});

	async hasMore(from: string, filePath: string): Promise<boolean> {
		const history = this._historyMap.get(historyKey(from, filePath));
		return history ? history[2] : true;
	}

	public getChangedFiles = reuseable(async (ref: string, forceUpdate = false): Promise<ChangedFile[]> => {
		const commit = await this.getItem(ref);
		const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
		return manager ? manager.getList(forceUpdate) : [];
	});

	public loadMoreChangedFiles = reuseable(async (ref: string): Promise<ChangedFile[]> => {
		const commit = await this.getItem(ref);
		const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
		return manager ? manager.loadMore() : [];
	});

	public hasMoreChangedFiles = reuseable(async (ref: string): Promise<boolean> => {
		const commit = await this.getItem(ref);
		const manager = commit ? CommitChangedFilesManager.getInstance(this._scheme, this._repo, commit.sha) : null;
		return manager ? manager.hasMore() : false;
	});

	// The latest commit touching the file may be older than the requested revision.
	public getLatestCommit = reuseable(async (from: string, filePath: string): Promise<Commit | null> => {
		const commits = await this.getList(from, filePath);
		return commits[0] || null;
	});

	// Keep the original history's `from`: at merges, the previous file revision
	// in that list can differ from the one found by querying from `sha`.
	public getPreviousCommit = reuseable(async (sha: string, filePath: string, from: string): Promise<Commit | null> => {
		const key = historyKey(from, filePath);
		let history = this._historyMap.get(key);
		if (!history) {
			// no history for the file, fetch the history first.
			await this.getList(from, filePath);
			history = this._historyMap.get(key)!;
		}

		if (history[0].indexOf(sha) < 0) {
			// Should appear only after moving forward a lot (exceeds page size)
			// and already lost the history (For example, refreshed the page)
			throw new Error(`Commit not found in the history`);
		}

		let index = history[0].indexOf(sha);
		if (index == history[0].length - 1 && history[2]) {
			// we should load more commits if the current commit
			// is the last one and there are more commits to load
			await this.loadMore(from || sha, filePath);
			history = this._historyMap.get(key);
			index = history?.[0].indexOf(sha) ?? -1;
		}
		// use the first commit if index is -1
		const targetSha = history?.[0][index + 1];
		return targetSha ? this._shaMap.get(targetSha) || null : null;
	});

	// Newer entries depend on the original history's `from`; a commit
	// SHA and file path alone do not provide that navigation context.
	public getNextCommit = reuseable(async (sha: string, filePath: string, from: string): Promise<Commit | null> => {
		const key = historyKey(from, filePath);
		let history = this._historyMap.get(key);
		if (!history) {
			// no history for the file, fetch the history first.
			await this.getList(from, filePath);
			history = this._historyMap.get(key)!;
		}
		const index = history?.[0].indexOf(sha) ?? -1;
		return index > 0 ? this._shaMap.get(history![0][index - 1]) || null : null;
	});
}
