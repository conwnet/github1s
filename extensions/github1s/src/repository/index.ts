/**
 * @file Current GitHub Repository
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
import router from '@/router';
import { getGitHubBranchRefs, getGitHubTagRefs } from '@/interfaces/github-api-rest';
import { apolloClient } from '@/interfaces/client';
import { githubFileBlameQuery } from '@/interfaces/github-api-gql';
import { getFetchOptions } from '@/helpers/fetch';
import { GitHubPullManager } from './github-pull-manager';
import { GitHubCommitManager } from './github-commit-manager';
import { RepositoryRef, BlameRange, PullManager } from './types';

export class Repository {
	private static instance: Repository;
	private _fileBlameMap: Map<string, BlameRange[]>;
	private _pullManager: PullManager;
	private _commitManager: GitHubCommitManager;

	public static getInstance() {
		if (Repository.instance) {
			return this.instance;
		}
		return (Repository.instance = new Repository());
	}

	constructor() {
		this._pullManager = new GitHubPullManager(this);
		this._commitManager = new GitHubCommitManager(this);
		this._fileBlameMap = new Map();
	}

	public getPullManager(): GitHubPullManager {
		return this._pullManager as GitHubPullManager;
	}

	public getCommitManager(): GitHubCommitManager {
		return this._commitManager as GitHubCommitManager;
	}

	// get current repo owner
	public getOwner() {
		const pathname = router.history.location.pathname;
		return pathname.split('/').filter(Boolean)[0] || 'conwnet';
	}

	// get current repo name
	public getRepo() {
		const pathname = router.history.location.pathname;
		return pathname.split('/').filter(Boolean)[1] || 'github1s';
	}

	// get all branches for current repository
	public getBranches = reuseable(
		async (forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGitHubBranchRefs(owner, repo, getFetchOptions(forceUpdate));
		}
	);

	// get all tags for current repository
	public getTags = reuseable(
		async (forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGitHubTagRefs(owner, repo, getFetchOptions(forceUpdate));
		}
	);

	public getFileBlame = reuseable(
		async (filePath: string, commitSha: string): Promise<BlameRange[]> => {
			const cacheKey = `${commitSha}:${filePath}`;

			if (!this._fileBlameMap.has(cacheKey)) {
				const [owner, repo] = [this.getOwner(), this.getRepo()];
				const response = await apolloClient.query({
					query: githubFileBlameQuery,
					variables: { owner, repo, ref: commitSha, path: filePath.slice(1) },
				});
				const blameRanges = response.data?.repository?.object?.blame?.ranges || [];
				this._fileBlameMap.set(cacheKey, blameRanges);
			}
			return this._fileBlameMap.get(cacheKey);
		}
	);
}

export default Repository.getInstance();
