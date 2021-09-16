/**
 * @file github1s data-source-provider
 * @author fezhang
 */

import {
	Branch,
	CodeLocation,
	CodeReview,
	CodeReviewStatus,
	CodeSearchOptions,
	Commit,
	CommonQueryOptions,
	DataSource,
	Directory,
	DirectoryEntry,
	File,
	FileBlameRange,
	FileType,
	Promisable,
	Tag,
} from '../types';
(self as any).global = self;
import { Octokit } from '@octokit/core';
import { toUint8Array } from 'js-base64';
import { reuseable } from '@/helpers/func';
import { matchSorter } from 'match-sorter';

const parseRepoFullName = (repoFullName: string) => {
	const [owner, repo] = repoFullName.split('/');
	return { owner, repo };
};

const encodeFilePath = (filePath: string): string => {
	const pathParts = filePath.split('/').filter(Boolean);
	return pathParts.map((segment) => encodeURIComponent(segment)).join('/');
};

const FileTypeMap = {
	blob: FileType.File,
	tree: FileType.Directory,
	commit: FileType.Submodule,
};

export class GitHub1sDataSource implements DataSource {
	private static instance: GitHub1sDataSource = null;
	private octokit = new Octokit({ auth: process.env.AUTH_TOKEN || '', request: { fetch } });
	private cachedBranches: Branch[] = null;
	private cachedTags: Branch[] = null;

	private constructor() {}

	public static getInstance(): GitHub1sDataSource {
		if (GitHub1sDataSource.instance) {
			return GitHub1sDataSource.instance;
		}
		return (GitHub1sDataSource.instance = new GitHub1sDataSource());
	}

	async provideDirectory(repoFullName: string, ref: string, path: string, recursive: boolean): Promise<Directory> {
		const encodedPath = encodeFilePath(path);
		// github api will return all files if `recursive` exists, even the value if false
		const recursiveParams = recursive ? { recursive } : {};
		const requestParams = { ref, path: encodedPath, ...parseRepoFullName(repoFullName), ...recursiveParams };
		const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/git/trees/{ref}:{path}', requestParams);
		const parseTreeItem = (treeItem): DirectoryEntry => ({
			path: treeItem.path,
			type: FileTypeMap[treeItem.type] || FileType.File,
			size: treeItem.size,
		});

		return {
			entries: (data.tree || []).map(parseTreeItem),
			truncated: !!data.truncated,
		};
	}

	async provideFile(repoFullName: string, ref: string, path: string): Promise<File> {
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref, path };
		const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', requestParams);
		return { content: toUint8Array((data as any).content) };
	}

	getMatchingRefs = reuseable(
		async (repoFullName: string, ref: 'heads' | 'tags'): Promise<Branch | Tag[]> => {
			const { owner, repo } = parseRepoFullName(repoFullName);
			const requestParams = { owner, repo, ref };
			const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/git/matching-refs/{ref}', requestParams);
			return data.map((item) => ({ name: item.ref.slice(ref === 'heads' ? 11 : 10), commitSha: item.object.sha }));
		}
	);

	async provideBranches(repoFullName: string, options: CommonQueryOptions): Promise<Branch[]> {
		if (!this.cachedBranches) {
			this.cachedBranches = (await this.getMatchingRefs(repoFullName, 'heads')) as Branch[];
		}
		const matchedBranches = matchSorter(this.cachedBranches, options.query, { keys: ['name'] });
		return matchedBranches.slice(options.pageSize * (options.page - 1), options.pageSize * options.page);
	}

	async provideBranch(repoFullName: string, branch: string): Promise<Branch> {
		if (!this.cachedBranches) {
			this.cachedBranches = (await this.getMatchingRefs(repoFullName, 'heads')) as Branch[];
		}
		return this.cachedBranches.find((item) => item.name === branch);
	}

	async provideTags(repoFullName: string, options: CommonQueryOptions): Promise<Tag[]> {
		if (!this.cachedTags) {
			this.cachedTags = (await this.getMatchingRefs(repoFullName, 'tags')) as Tag[];
		}
		const matchedTags = matchSorter(this.cachedBranches, options.query, { keys: ['name'] });
		return matchedTags.slice(options.pageSize * (options.page - 1), options.pageSize * options.page);
	}

	async provideTag(repoFullName: string, tag: string): Promise<Tag> {
		if (!this.cachedBranches) {
			this.cachedBranches = (await this.getMatchingRefs(repoFullName, 'heads')) as Branch[];
		}
		return this.cachedBranches.find((item) => item.name === tag);
	}

	async provideCommits(
		repoFullName: string,
		options: CommonQueryOptions & {
			from?: string;
			author?: string;
			path?: string;
		}
	): Promise<Commit[]> {
		// const { owner, repo } = parseRepoFullName(repoFullName);
		// const requestParams = { owner, repo, page: options.page, per_page: options.pageSize};
		// const { data } = await this.octokit.request('/repos/{owner}/{repo}/commits', requestParams);
		throw new Error('Method not implemented.');

	}

	provideCommit(repo: string, ref: string): Promisable<Commit> {
		throw new Error('Method not implemented.');
	}

	provideTextSearchResults(
		repo: string,
		ref: string,
		query: string,
		options: CodeSearchOptions,
		report: (results: CodeLocation[]) => void
	): Promisable<{ limitHit: boolean }> {
		throw new Error('Method not implemented.');
	}

	provideCodeReviews(
		repo: string,
		options: CommonQueryOptions & { state?: CodeReviewStatus; creator?: string }
	): Promisable<CodeReview[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeReview(repo: string, id: string): Promisable<CodeReview> {
		throw new Error('Method not implemented.');
	}

	provideFileBlameRanges(repo: string, ref: string, path: string): Promisable<FileBlameRange[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeDefinition(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): Promisable<CodeLocation | CodeLocation[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): Promisable<CodeLocation[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeHover(repo: string, ref: string, path: string, line: number, character: number): Promisable<string> {
		throw new Error('Method not implemented.');
	}

	provideUserAvatarLink(user: string): Promisable<string> {
		throw new Error('Method not implemented.');
	}
}
