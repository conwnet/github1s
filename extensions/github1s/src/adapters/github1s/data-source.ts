/**
 * @file github1s data-source-provider
 * @author netcon
 */

import {
	Branch,
	CodeReview,
	CodeReviewState,
	TextSearchOptions,
	Commit,
	CommonQueryOptions,
	DataSource,
	Directory,
	DirectoryEntry,
	File,
	BlameRange,
	FileType,
	Tag,
	TextSearchResults,
	TextSearchQuery,
	SymbolDefinitions,
	SymbolReferences,
	FileChangeStatus,
	ChangedFile,
	SymbolHover,
	CommitsQueryOptions,
	CodeReviewsQueryOptions,
} from '../types';
import { toUint8Array } from 'js-base64';
import { matchSorter } from 'match-sorter';
import { FILE_BLAME_QUERY } from './graphql';
import { GitHubFetcher } from './fetcher';
import { SourcegraphDataSource } from '../sourcegraph/data-source';
import { decorate, memorize } from '@/helpers/func';

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

const getPullState = (pull: { state: string; merged_at: string | null }): CodeReviewState => {
	// current pull request is open
	if (pull.state === 'open') {
		return CodeReviewState.Open;
	}
	// current pull request is merged
	if (pull.state === 'closed' && pull.merged_at) {
		return CodeReviewState.Merged;
	}
	// current pull is closed
	return CodeReviewState.Closed;
};

const sourcegraphDataSource = SourcegraphDataSource.getInstance('github');
const trySourcegraphApiFirst = (_target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
	const originalMethod = descriptor.value;

	descriptor.value = async function <T extends (...args) => Promise<any>>(...args: Parameters<T>) {
		const githubFetcher = GitHubFetcher.getInstance();
		if (await githubFetcher.getPreferSourcegraphApi(args[0])) {
			try {
				return await sourcegraphDataSource[propertyKey](...args);
			} catch (e) {}
		}
		return originalMethod.apply(this, args);
	};
};

export class GitHub1sDataSource extends DataSource {
	private static instance: GitHub1sDataSource | null = null;
	private branchesPromiseMap: Map<string, Promise<Branch[]>> = new Map();
	private tagsPromiseMap: Map<string, Promise<Tag[]>> = new Map();
	private refPathPromiseMap: Map<string, Promise<{ ref: string; path: string }>> = new Map();
	private matchedRefsMap = new Map<string, string[]>();

	public static getInstance(): GitHub1sDataSource {
		if (GitHub1sDataSource.instance) {
			return GitHub1sDataSource.instance;
		}
		return (GitHub1sDataSource.instance = new GitHub1sDataSource());
	}

	@trySourcegraphApiFirst
	async provideRepository(repoFullName: string): Promise<{ private: boolean; defaultBranch: string } | null> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo };
		const response = await fetcher.request('GET /repos/{owner}/{repo}', requestParams).catch(() => null);
		return response?.data ? { private: response.data.private, defaultBranch: response.data.default_branch } : null;
	}

	@trySourcegraphApiFirst
	async provideDirectory(repoFullName: string, ref: string, path: string, recursive = false): Promise<Directory> {
		const fetcher = GitHubFetcher.getInstance();
		const encodedPath = encodeFilePath(path);
		// github api will return all files if `recursive` exists, even the value if false
		const recursiveParams = recursive ? { recursive } : {};
		const requestParams = { ref, path: encodedPath, ...parseRepoFullName(repoFullName), ...recursiveParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/git/trees/{ref}:{path}', requestParams);
		const parseTreeItem = (treeItem): DirectoryEntry => ({
			path: treeItem.path,
			type: FileTypeMap[treeItem.type] || FileType.File,
			commitSha: FileTypeMap[treeItem.type] === FileType.Submodule ? treeItem.sha || 'HEAD' : undefined,
			size: treeItem.size,
		});

		return {
			entries: (data.tree || []).map(parseTreeItem),
			truncated: !!data.truncated,
		};
	}

	@trySourcegraphApiFirst
	async provideFile(repoFullName: string, ref: string, path: string): Promise<File> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref, path };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/contents/{path}', requestParams);
		return { content: toUint8Array((data as any).content) };
	}

	async getMatchingRefs(repoFullName: string, ref: 'heads' | 'tags'): Promise<Branch[] | Tag[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/git/matching-refs/{ref}', requestParams);
		return data.map((item) => ({
			name: item.ref.slice(ref === 'heads' ? 11 : 10),
			commitSha: item.object.sha,
			description: `${ref === 'heads' ? 'Branch' : 'Tag'} at ${item.object.sha.slice(0, 8)}`,
		}));
	}

	@decorate(memorize)
	async getDefaultBranch(repoFullName: string) {
		return (await this.provideRepository(repoFullName))?.defaultBranch || 'HEAD';
	}

	@trySourcegraphApiFirst
	async extractRefPath(repoFullName: string, refAndPath: string): Promise<{ ref: string; path: string }> {
		if (!this.matchedRefsMap.has(repoFullName)) {
			this.matchedRefsMap.set(repoFullName, []);
		}
		const matchPathRef = (ref) => refAndPath.startsWith(`${ref}/`) || refAndPath === ref;
		const matchedRef = this.matchedRefsMap.get(repoFullName)?.find(matchPathRef);
		if (matchedRef) {
			return { ref: matchedRef, path: refAndPath.slice(matchedRef.length + 1) };
		}
		const mapKey = `${repoFullName} ${refAndPath}`;
		if (!this.refPathPromiseMap.has(mapKey)) {
			const refPathPromise = new Promise<{ ref: string; path: string }>(async (resolve, reject) => {
				if (!refAndPath) {
					return resolve({ ref: await this.getDefaultBranch(repoFullName), path: '' });
				}
				if (refAndPath.match(/^HEAD(\/.*)?$/i)) {
					return resolve({ ref: 'HEAD', path: refAndPath.slice(5) });
				}

				const fetcher = GitHubFetcher.getInstance();
				const { owner, repo } = parseRepoFullName(repoFullName);
				const requestParams = { owner, repo, refAndPath };
				const requestUrl = `GET /repos/{owner}/{repo}/git/extract-ref/{refAndPath}`;
				const response = await fetcher.request(requestUrl, requestParams).catch(reject);
				response?.data?.ref && this.matchedRefsMap.get(repoFullName)?.push(response.data.ref);
				return resolve(response?.data || { ref: 'HEAD', path: '' });
			});
			this.refPathPromiseMap.set(mapKey, refPathPromise);
		}
		return this.refPathPromiseMap.get(mapKey)!;
	}

	@trySourcegraphApiFirst
	async provideBranches(repoFullName: string, options?: CommonQueryOptions): Promise<Branch[]> {
		if (!this.branchesPromiseMap.has(repoFullName)) {
			this.branchesPromiseMap.set(repoFullName, this.getMatchingRefs(repoFullName, 'heads'));
		}
		return this.branchesPromiseMap.get(repoFullName)!.then((branches) => {
			const matchOptions = { keys: ['name'] };
			const matchedBranches = options?.query ? matchSorter(branches, options.query, matchOptions) : branches;
			if (options?.pageSize) {
				const page = options.page || 1;
				const pageSize = options.pageSize;
				return matchedBranches.slice(pageSize * (page - 1), pageSize * page);
			}
			return matchedBranches;
		});
	}

	@trySourcegraphApiFirst
	async provideBranch(repoFullName: string, branchName: string): Promise<Branch | null> {
		const branches = await this.provideBranches(repoFullName);
		return branches.find((item) => item.name === branchName) || null;
	}

	@trySourcegraphApiFirst
	async provideTags(repoFullName: string, options?: CommonQueryOptions): Promise<Tag[]> {
		if (!this.tagsPromiseMap.has(repoFullName)) {
			this.tagsPromiseMap.set(repoFullName, this.getMatchingRefs(repoFullName, 'tags'));
		}
		return this.tagsPromiseMap.get(repoFullName)!.then((tags) => {
			const matchOptions = { keys: ['name'] };
			const matchedTags = options?.query ? matchSorter(tags, options.query, matchOptions) : tags;
			if (options?.pageSize) {
				const page = options.page || 1;
				const pageSize = options.pageSize;
				return matchedTags.slice(pageSize * (page - 1), pageSize * page);
			}
			return matchedTags;
		});
	}

	@trySourcegraphApiFirst
	async provideTag(repoFullName: string, tagName: string): Promise<Tag | null> {
		const tags = await this.provideTags(repoFullName);
		return tags.find((item) => item.name === tagName) || null;
	}

	async provideTextSearchResults(
		repoFullName: string,
		ref: string,
		query: TextSearchQuery,
		options: TextSearchOptions,
	): Promise<TextSearchResults> {
		return sourcegraphDataSource.provideTextSearchResults(repoFullName, ref, query, options);
	}

	@trySourcegraphApiFirst
	async provideCommits(
		repoFullName: string,
		options?: CommitsQueryOptions,
	): Promise<(Commit & { files?: ChangedFile[] })[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const queryParams = {
			page: options?.page,
			per_page: options?.pageSize,
			sha: options?.from,
			path: options?.path,
			author: options?.author,
		};
		const requestParams = { owner, repo, ...queryParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/commits', requestParams);
		return data.map((item) => ({
			sha: item.sha,
			author: item.commit.author?.name,
			email: item.commit.author?.email,
			message: item.commit.message,
			committer: item.commit.committer?.name,
			createTime: item.commit.author?.date ? new Date(item.commit.author.date) : undefined,
			parents: item.parents.map((parent) => parent.sha) || [],
			avatarUrl: item.author?.avatar_url,
		}));
	}

	@trySourcegraphApiFirst
	async provideCommit(repoFullName: string, ref: string): Promise<Commit & { files?: ChangedFile[] }> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/commits/{ref}', requestParams);
		return {
			sha: data.sha,
			author: data.commit.author?.name,
			email: data.commit.author?.email,
			message: data.commit.message,
			committer: data.commit.committer?.name,
			createTime: data.commit.author?.date ? new Date(data.commit.author.date) : undefined,
			parents: data.parents.map((parent) => parent.sha) || [],
			files: data.files?.map((item) => ({
				path: item.filename || item.previous_filename!,
				previousPath: item.previous_filename,
				status: item.status as FileChangeStatus,
			})),
			avatarUrl: data.author?.avatar_url,
		};
	}

	@trySourcegraphApiFirst
	async provideCommitChangedFiles(
		repoFullName: string,
		ref: string,
		_options?: CommonQueryOptions,
	): Promise<ChangedFile[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/commits/{ref}', requestParams);
		return (
			data.files?.map((item) => ({
				path: item.filename || item.previous_filename!,
				previousPath: item.previous_filename,
				status: item.status as FileChangeStatus,
			})) || []
		);
	}

	async provideCodeReviews(
		repoFullName: string,
		options?: CodeReviewsQueryOptions,
	): Promise<(CodeReview & { files?: ChangedFile[] })[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const state = options?.state ? (options.state === CodeReviewState.Open ? 'open' : 'closed') : 'all';
		const queryParams = { state, page: options?.page, per_page: options?.pageSize, creator: options?.creator };
		const requestParams = { owner, repo, ...queryParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/pulls', requestParams as any);

		return data.map((item) => ({
			id: `${item.number}`,
			title: item.title,
			state: getPullState(item),
			creator: item.user?.login,
			createTime: new Date(item.created_at),
			mergeTime: item.merged_at ? new Date(item.merged_at) : null,
			closeTime: item.closed_at ? new Date(item.closed_at) : null,
			source: item.head.label,
			target: item.base.label,
			sourceSha: item.head.sha,
			targetSha: item.base.sha,
			avatarUrl: item.user?.avatar_url,
		}));
	}

	async provideCodeReview(repoFullName: string, id: string) {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const pullRequestParams = { owner, repo, pull_number: Number(id) };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', pullRequestParams);

		return {
			id: `${data.number}`,
			title: data.title,
			state: getPullState(data),
			creator: data.user?.login,
			createTime: new Date(data.created_at),
			mergeTime: data.merged_at ? new Date(data.merged_at) : null,
			closeTime: data.closed_at ? new Date(data.closed_at) : null,
			source: data.head.label,
			target: data.base.label,
			sourceSha: data.head.sha,
			targetSha: data.base.sha,
			avatarUrl: data.user?.avatar_url,
		};
	}

	async provideCodeReviewChangedFiles(
		repoFullName: string,
		id: string,
		options?: CommonQueryOptions,
	): Promise<ChangedFile[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const pageParams = { per_page: options?.pageSize, page: options?.page };
		const filesRequestParams = { owner, repo, pull_number: Number(id), ...pageParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', filesRequestParams);

		return data.map((item) => ({
			path: item.filename,
			previousPath: item.previous_filename,
			status: item.status as FileChangeStatus,
		}));
	}

	@trySourcegraphApiFirst
	async provideFileBlameRanges(repoFullName: string, ref: string, path: string): Promise<BlameRange[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref, path };
		const data = await fetcher.graphql(FILE_BLAME_QUERY, requestParams);
		const blameRanges = (data as any)?.repository?.object?.blame?.ranges;

		return (blameRanges || []).map((item) => ({
			age: item.age as number,
			startingLine: item.startingLine as number,
			endingLine: item.endingLine as number,
			commit: {
				sha: item.commit?.sha as string,
				author: item.commit?.author?.name as string,
				email: item.commit?.author?.email as string,
				message: item.commit?.message as string,
				createTime: new Date(item.commit?.authoredDate),
				avatarUrl: item.commit?.author?.avatarUrl as string,
			},
		}));
	}

	provideSymbolDefinitions(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string,
	): Promise<SymbolDefinitions> {
		return sourcegraphDataSource.provideSymbolDefinitions(repoFullName, ref, path, line, character, symbol);
	}

	async provideSymbolReferences(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string,
	): Promise<SymbolReferences> {
		return sourcegraphDataSource.provideSymbolReferences(repoFullName, ref, path, line, character, symbol);
	}

	async provideSymbolHover(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		_symbol: string,
	): Promise<SymbolHover | null> {
		return sourcegraphDataSource.provideSymbolHover(repoFullName, ref, path, line, character, _symbol);
	}

	provideUserAvatarLink(user: string): string {
		return `${GITHUB_ORIGIN}/${user}.png`;
	}
}
