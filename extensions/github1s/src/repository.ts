/**
 * @file Current GitHub Repository
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
import router from '@/router';
import {
	getGithubBranchRefs,
	getGitHubPullDetail,
	getGithubTagRefs,
	getGithubPullFiles,
	getGitHubPulls,
	getGitHubCommitDetail,
} from '@/interfaces/github-api-rest';

export interface RepositoryRef {
	name: string;
	ref: string;
	node_id: string;
	url: string;
	object: {
		sha: string;
		type: string;
		url: string;
	};
}

export interface RepositoryPull {
	number: string;
	title: string;
	state: string;
	created_at: string;
	closed_at: string;
	merged_at: string;
	user: {
		login: string;
		avatar_url: string;
	};
	head: {
		sha: string;
	};
	base: {
		sha: string;
	};
}

export interface RepositoryCommit {
	sha: string;
	author: {
		login: string;
		avatar_url: string;
	};
	parents: { sha: string }[];
	files: RepositoryChangedFile[];
}

export enum FileChangeType {
	ADDED = 'added',
	REMOVED = 'removed',
	MODIFIED = 'modified',
	RENAMED = 'renamed',
}

export interface RepositoryChangedFile {
	filename: string;
	previous_filename?: string;
	status: FileChangeType;
}

export class Repository {
	private static instance: Repository;

	public static getInstance() {
		if (Repository.instance) {
			return this.instance;
		}
		return (Repository.instance = new Repository());
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
			return await getGithubBranchRefs(owner, repo, {
				cache: forceUpdate ? 'reload' : 'force-cache',
			});
		}
	);

	// get all tags for current repository
	public getTags = reuseable(
		async (forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGithubTagRefs(owner, repo, {
				cache: forceUpdate ? 'reload' : 'force-cache',
			});
		}
	);

	public getPulls = reuseable(
		async (forceUpdate: boolean = false): Promise<RepositoryPull[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGitHubPulls(owner, repo, {
				cache: forceUpdate ? 'reload' : 'force-cache',
			});
		}
	);

	public getPull = reuseable(
		async (
			pullNumber: number,
			forceUpdate: boolean = false
		): Promise<RepositoryPull> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGitHubPullDetail(owner, repo, pullNumber, {
				cache: forceUpdate ? 'reload' : 'force-cache',
			});
		}
	);

	public getPullFiles = reuseable(
		async (
			pullNumber: number,
			forceUpdate: boolean = false
		): Promise<RepositoryChangedFile[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGithubPullFiles(owner, repo, pullNumber, {
				cache: forceUpdate ? 'reload' : 'force-cache',
			});
		}
	);

	public getCommit = reuseable(
		async (
			commitSha: string,
			forceUpdate: boolean = false
		): Promise<RepositoryCommit> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			return getGitHubCommitDetail(owner, repo, commitSha, {
				cache: forceUpdate ? 'reload' : 'force-cache',
			});
		}
	);

	public getCommitFiles = reuseable(
		async (
			commitSha: string,
			forceUpdate: boolean = false
		): Promise<RepositoryChangedFile[]> => {
			const [owner, repo] = [this.getOwner(), this.getRepo()];
			const commitData = await getGitHubCommitDetail(owner, repo, commitSha, {
				cache: forceUpdate ? 'reload' : 'force-cache',
			});
			return commitData.files;
		}
	);
}

export default Repository.getInstance();
