/**
 * @file Current GitHub Repository
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
import router from '@/router';
import {
	getGitHubBranchRefs,
	getGitHubPullDetail,
	getGitHubTagRefs,
	getGitHubPullFiles,
	getGitHubPulls,
	getGitHubCommitDetail,
	getGitHubCommits,
	getGitHubFileCommits,
} from '@/interfaces/github-api-rest';
import { getFetchOptions } from '@/helpers/fetch';
import { LinkedList, LinkedListDirection } from './linked-list';
import {
	RepositoryChangedFile,
	RepositoryCommit,
	RepositoryPull,
	RepositoryRef,
} from './types';

export class Repository {
	private static instance: Repository;
	private _fileCommitIdListMap: Map<string, LinkedList>;
	private _pullMap: Map<number, RepositoryPull>;
	private _commitMap: Map<string, RepositoryCommit>;

	public static getInstance() {
		if (Repository.instance) {
			return this.instance;
		}
		return (Repository.instance = new Repository());
	}

	constructor() {
		this._fileCommitIdListMap = new Map();
		this._pullMap = new Map();
		this._commitMap = new Map();
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
			return await getGitHubBranchRefs(
				owner,
				repo,
				getFetchOptions(forceUpdate)
			);
		}
	);

	// get all tags for current repository
	public getTags = reuseable(
		async (forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGitHubTagRefs(owner, repo, getFetchOptions(forceUpdate));
		}
	);

	public getPulls = reuseable(
		async (forceUpdate: boolean = false): Promise<RepositoryPull[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			const fetchOptions = getFetchOptions(forceUpdate);
			const pulls = await getGitHubPulls(owner, repo, fetchOptions);
			// `this.getPull` can be benefited from the cache
			pulls.forEach((pull) => this._pullMap.set(pull.number, pull));
			return pulls;
		}
	);

	public getPull = reuseable(
		async (
			pullNumber: number,
			forceUpdate: boolean = false
		): Promise<RepositoryPull> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			if (forceUpdate || !this._pullMap.has(pullNumber)) {
				const pull = await getGitHubPullDetail(
					owner,
					repo,
					pullNumber,
					getFetchOptions(forceUpdate)
				);
				this._pullMap.set(pullNumber, pull);
			}
			return this._pullMap.get(pullNumber);
		}
	);

	public getPullFiles = reuseable(
		async (
			pullNumber: number,
			forceUpdate: boolean = false
		): Promise<RepositoryChangedFile[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGitHubPullFiles(
				owner,
				repo,
				pullNumber,
				getFetchOptions(forceUpdate)
			);
		}
	);

	public getCommits = reuseable(
		async (
			sha: string,
			forceUpdate: boolean = false
		): Promise<RepositoryCommit[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			const fetchOptions = getFetchOptions(forceUpdate);
			const commits = await getGitHubCommits(owner, repo, sha, fetchOptions);
			// `this.getCommit` can be benefited from the cache
			commits.forEach((commit) => this._commitMap.set(commit.sha, commit));
			return commits;
		}
	);

	public getCommit = reuseable(
		async (
			commitSha: string,
			forceUpdate: boolean = false
		): Promise<RepositoryCommit> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			if (forceUpdate || !this._commitMap.has(commitSha)) {
				const commit = await getGitHubCommitDetail(
					owner,
					repo,
					commitSha,
					getFetchOptions(forceUpdate)
				);
				this._commitMap.set(commitSha, commit);
			}
			return this._commitMap.get(commitSha);
		}
	);

	public getCommitFiles = reuseable(
		async (
			commitSha: string,
			forceUpdate: boolean = false
		): Promise<RepositoryChangedFile[]> => {
			return (
				// the commit maybe updated by fetch commit **list** which
				// won't have the file list data, so we will fallback to
				// fetch single commit data to get the file list data
				(await this.getCommit(commitSha, forceUpdate)).files ||
				(await this.getCommit(commitSha, true)).files
			);
		}
	);

	// get this commits for a specified file
	public getFileCommits = reuseable(
		async (
			filePath: string,
			commitSha: string,
			forceUpdate: boolean = false
		): Promise<RepositoryCommit[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			const commits = await getGitHubFileCommits(
				owner,
				repo,
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
				const commits = await this.getFileCommits(
					filePath,
					commitShaOrRef,
					forceUpdate
				);
				commitIdList.update(commits.map((item) => item.sha).reverse());
				// Actually the latest commit for `filePath` maybe not equal the
				// `commitSha` in arguments, we should use commits[0].sha in this case
				return commitIdList.getNodeId(commits[0]?.sha, direction);
			}
			return commitIdList.getNodeId(commitShaOrRef, direction);
		}
	);

	public getFilePrevCommitSha = reuseable(
		async (
			filePath: string,
			commitSha: string,
			forceUpdate: boolean = false
		): Promise<string> => {
			return this.getFileCommitSha(
				filePath,
				commitSha,
				LinkedListDirection.PREVIOUS,
				forceUpdate
			);
		}
	);

	public getFileNextCommitSha = reuseable(
		async (filePath: string, commitSha: string): Promise<string | void> => {
			// because we can not find the next commit by GitHub API,
			// we can only try to find the next commit from the cache
			return this._fileCommitIdListMap
				.get(filePath)
				?.getNodeId(commitSha, LinkedListDirection.NEXT);
		}
	);
}

export default Repository.getInstance();
