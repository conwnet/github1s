/**
 * @file GitHub pull manager
 * @author netcon
 */

import { getGitHubCommits, getGitHubCommitDetail, getGitHubFileCommits } from '@/interfaces/github-api-rest';
import { getFetchOptions } from '@/helpers/fetch';
import { reuseable } from '@/helpers/func';
import { Barrier } from '@/helpers/async';
import { LinkedList, LinkedListDirection } from './linked-list';
import { Repository } from './index';
import { CommitManager, RepositoryCommit, RepositoryChangedFile } from './types';

export class GitHubCommitManager implements CommitManager {
	private _commitMap = new Map<string, RepositoryCommit>();
	private _fileCommitIdListMap = new Map<string, LinkedList>();
	private _commitListMap = new Map<string, Array<RepositoryCommit>>();
	private _pageSize = 100;
	private _currentPageNumber = 1; // page number is begin from 1
	private _hasMore = true;
	private _loadingBarrier = new Barrier();

	constructor(public repository: Repository) {
		this._loadingBarrier.open();
	}

	getList = reuseable(
		async (commitSha: string, forceUpdate: boolean = false): Promise<RepositoryCommit[]> => {
			if (forceUpdate || !this._commitListMap.has(commitSha)) {
				this._commitListMap.set(commitSha, []);
				this._currentPageNumber = 0;
				this.loadMore(commitSha);
			}
			await this._loadingBarrier.wait();
			return this._commitListMap.get(commitSha);
		}
	);

	getItem = reuseable(
		async (commitSha: string, forceUpdate: boolean = false): Promise<RepositoryCommit> => {
			if (forceUpdate || !this._commitMap.has(commitSha)) {
				const commit = await getGitHubCommitDetail(
					this.repository.getOwner(),
					this.repository.getRepo(),
					commitSha,
					getFetchOptions(forceUpdate)
				);
				this._commitMap.set(commitSha, commit);
			}
			return this._commitMap.get(commitSha);
		}
	);

	async loadMore(commitSha: string) {
		this._loadingBarrier = new Barrier();
		const fetchOptions = getFetchOptions(true);
		const commits = await getGitHubCommits(
			this.repository.getOwner(),
			this.repository.getRepo(),
			commitSha,
			this._currentPageNumber,
			this._pageSize,
			fetchOptions
		);

		commits.forEach((commit) => this._commitMap.set(commit.sha, commit));
		this._commitListMap.get(commitSha).push(...commits);
		this._currentPageNumber += 1;
		this._hasMore = commits.length === this._pageSize;
		this._loadingBarrier.open();

		return this._hasMore;
	}

	async hasMore() {
		await this._loadingBarrier.wait();
		return this._hasMore;
	}

	public getCommitFiles = reuseable(
		async (commitSha: string, forceUpdate: boolean = false): Promise<RepositoryChangedFile[]> => {
			return (
				// the commit maybe updated by fetch commit **list** which
				// won't have the file list data, so we will fallback to
				// fetch single commit data to get the file list data
				(await this.getItem(commitSha, forceUpdate)).files || (await this.getItem(commitSha, true)).files
			);
		}
	);

	// get this commits for a specified file
	public getFileCommits = reuseable(
		async (filePath: string, commitSha: string, forceUpdate: boolean = false): Promise<RepositoryCommit[]> => {
			const commits = await getGitHubFileCommits(
				this.repository.getOwner(),
				this.repository.getRepo(),
				filePath,
				commitSha,
				getFetchOptions(forceUpdate)
			);
			// `this.getCommit` can be benefited from the cache
			commits.forEach((commit) => this._commitMap.set(commit.sha, commit));
			return commits;
		}
	);

	// get the commit sha of a file with direction, default get
	// the latest commit sha for the file, note this the latest
	// commit sha maybe not equal the `commitSha` in arguments
	public getFileCommitSha = reuseable(
		async (
			filePath: string,
			commitShaOrRef: string,
			direction: LinkedListDirection = LinkedListDirection.CURRENT,
			forceUpdate: boolean = false
		): Promise<string> => {
			if (!this._fileCommitIdListMap.has(filePath)) {
				this._fileCommitIdListMap.set(filePath, new LinkedList());
			}
			const commitIdList = this._fileCommitIdListMap.get(filePath);
			if (!commitIdList.getNodeId(commitShaOrRef, direction)) {
				const commits = await this.getFileCommits(filePath, commitShaOrRef, forceUpdate);
				commitIdList.update(commits.map((item) => item.sha).reverse());
				// Actually the latest commit for `filePath` maybe not equal the
				// `commitSha` in arguments, we should use commits[0].sha in this case
				return commitIdList.getNodeId(commits[0]?.sha, direction);
			}
			return commitIdList.getNodeId(commitShaOrRef, direction);
		}
	);

	public getFilePrevCommitSha = reuseable(
		async (filePath: string, commitSha: string, forceUpdate: boolean = false): Promise<string> => {
			return this.getFileCommitSha(filePath, commitSha, LinkedListDirection.PREVIOUS, forceUpdate);
		}
	);

	public getFileNextCommitSha = reuseable(
		async (filePath: string, commitSha: string): Promise<string | void> => {
			// because we can not find the next commit by GitHub API,
			// we can only try to find the next commit from the cache
			return this._fileCommitIdListMap.get(filePath)?.getNodeId(commitSha, LinkedListDirection.NEXT);
		}
	);
}
