/**
 * @file GitHub pull manager
 * @author netcon
 */

import { getGitHubPulls, getGitHubPullFiles, getGitHubPullDetail } from '@/interfaces/github-api-rest';
import { getFetchOptions } from '@/helpers/fetch';
import { reuseable } from '@/helpers/func';
import { Barrier } from '@/helpers/async';
import { Repository } from './index';
import { PullManager, RepositoryPull, RepositoryChangedFile } from './types';

export class GitHubPullManager implements PullManager {
	private _pullMap = new Map<number, RepositoryPull>();
	private _pullList = null;
	private _pageSize = 100;
	private _currentPageNumber = 1; // page number is begin from 1
	private _hasMore = true;
	private _loadingBarrier = new Barrier();

	constructor(public repository: Repository) {
		this._loadingBarrier.open();
	}

	getList = reuseable(
		async (forceUpdate: boolean = false): Promise<RepositoryPull[]> => {
			if (forceUpdate || !this._pullList) {
				this._pullList = [];
				this._currentPageNumber = 0;
				this.loadMore();
			}
			await this._loadingBarrier.wait();
			return this._pullList;
		}
	);

	getItem = reuseable(
		async (pullNumber: number, forceUpdate: boolean = false): Promise<RepositoryPull> => {
			if (forceUpdate || !this._pullMap.has(pullNumber)) {
				const pull = await getGitHubPullDetail(
					this.repository.getOwner(),
					this.repository.getRepo(),
					pullNumber,
					getFetchOptions(forceUpdate)
				);
				this._pullMap.set(pullNumber, pull);
			}
			return this._pullMap.get(pullNumber);
		}
	);

	async loadMore() {
		this._loadingBarrier = new Barrier();
		const fetchOptions = getFetchOptions(true);
		const pulls = await getGitHubPulls(
			this.repository.getOwner(),
			this.repository.getRepo(),
			this._currentPageNumber,
			this._pageSize,
			fetchOptions
		);

		pulls.forEach((pull) => this._pullMap.set(pull.number, pull));
		this._pullList.push(...pulls);
		this._currentPageNumber += 1;
		this._hasMore = pulls.length === this._pageSize;
		this._loadingBarrier.open();

		return this._hasMore;
	}

	async hasMore() {
		await this._loadingBarrier.wait();
		return this._hasMore;
	}

	public getPullFiles = reuseable(
		async (pullNumber: number, forceUpdate: boolean = false): Promise<RepositoryChangedFile[]> => {
			return getGitHubPullFiles(
				this.repository.getOwner(),
				this.repository.getRepo(),
				pullNumber,
				getFetchOptions(forceUpdate)
			);
		}
	);
}
