/**
 * @file github1s data-source-provider
 * @author conwnet
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
	FileBlameRange,
	FileType,
	Tag,
	TextSearchResults,
	TextSearchQuery,
	SymbolDefinitions,
	SymbolReferences,
	FileChangeStatus,
	ChangedFile,
	Promisable,
	SymbolHover,
} from '../types';
(self as any).global = self;
import { toUint8Array } from 'js-base64';
import { matchSorter } from 'match-sorter';
import { reuseable } from '@/helpers/func';
import { getTextSearchResults } from '../sourcegraph/search';
import { getSymbolDefinitions } from '../sourcegraph/definition';
import { getSymbolReferences } from '../sourcegraph/reference';
import { FILE_BLAME_QUERY } from './graphql';
import { GitHubFetcher } from './fetcher';
import { getSymbolHover } from '../sourcegraph/hover';

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

const getPullState = (pull: { state: string; merged_at?: string }): CodeReviewState => {
	// current pull request is open
	if (pull.state === 'open') {
		return CodeReviewState.Open;
	}
	// current pull request is merged
	if (pull.state === 'closed' && pull.merged_at) {
		return CodeReviewState.Merged;
	}
	// current pull is closed
	return CodeReviewState.Merged;
};

export const escapeRegexp = (text: string): string => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export class GitHub1sDataSource extends DataSource {
	private static instance: GitHub1sDataSource | null = null;
	private cachedBranches: Branch[] | null = null;
	private cachedTags: Branch[] | null = null;

	public static getInstance(): GitHub1sDataSource {
		if (GitHub1sDataSource.instance) {
			return GitHub1sDataSource.instance;
		}
		return (GitHub1sDataSource.instance = new GitHub1sDataSource());
	}

	async provideDirectory(repoFullName: string, ref: string, path: string, recursive: boolean): Promise<Directory> {
		const fetcher = GitHubFetcher.getInstance();
		const encodedPath = encodeFilePath(path);
		// github api will return all files if `recursive` exists, even the value if false
		const recursiveParams = recursive ? { recursive } : {};
		const requestParams = { ref, path: encodedPath, ...parseRepoFullName(repoFullName), ...recursiveParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/git/trees/{ref}:{path}', requestParams);
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
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref, path };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/contents/{path}', requestParams);
		return { content: toUint8Array((data as any).content) };
	}

	getMatchingRefs = reuseable(
		async (repoFullName: string, ref: 'heads' | 'tags'): Promise<Branch | Tag[]> => {
			const fetcher = GitHubFetcher.getInstance();
			const { owner, repo } = parseRepoFullName(repoFullName);
			const requestParams = { owner, repo, ref };
			const { data } = await fetcher.request('GET /repos/{owner}/{repo}/git/matching-refs/{ref}', requestParams);
			return data.map((item) => ({ name: item.ref.slice(ref === 'heads' ? 11 : 10), commitSha: item.object.sha }));
		}
	);

	async provideBranches(repoFullName: string, options: CommonQueryOptions): Promise<Branch[]> {
		if (!this.cachedBranches) {
			this.cachedBranches = (await this.getMatchingRefs(repoFullName, 'heads')) as Branch[];
		}
		const matchedBranches = options.query
			? matchSorter(this.cachedBranches, options.query, { keys: ['name'] })
			: this.cachedBranches;
		return matchedBranches.slice(options.pageSize * (options.page - 1), options.pageSize * options.page);
	}

	async provideBranch(repoFullName: string, branch: string): Promise<Branch | null> {
		if (!this.cachedBranches) {
			this.cachedBranches = (await this.getMatchingRefs(repoFullName, 'heads')) as Branch[];
		}
		return this.cachedBranches.find((item) => item.name === branch) || null;
	}

	async provideTags(repoFullName: string, options: CommonQueryOptions): Promise<Tag[]> {
		if (!this.cachedTags) {
			this.cachedTags = (await this.getMatchingRefs(repoFullName, 'tags')) as Tag[];
		}
		const matchedTags = options.query
			? matchSorter(this.cachedTags, options.query, { keys: ['name'] })
			: this.cachedTags;
		return matchedTags.slice(options.pageSize * (options.page - 1), options.pageSize * options.page);
	}

	async provideTag(repoFullName: string, tag: string): Promise<Tag | null> {
		if (!this.cachedTags) {
			this.cachedTags = (await this.getMatchingRefs(repoFullName, 'heads')) as Tag[];
		}
		return this.cachedTags.find((item) => item.name === tag) || null;
	}

	async provideTextSearchResults(
		repoFullName: string,
		ref: string,
		query: TextSearchQuery,
		options: TextSearchOptions
	): Promise<TextSearchResults> {
		const repoPattern = `^${escapeRegexp(`github\.com/${repoFullName}`)}$`;
		return getTextSearchResults(repoPattern, ref, query, options);
	}
	async provideCommits(
		repoFullName: string,
		options: CommonQueryOptions & {
			from?: string;
			author?: string;
			path?: string;
		}
	): Promise<(Commit & { files?: ChangedFile[] })[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const queryParams = {
			page: options.page,
			per_page: options.pageSize,
			sha: options.from,
			path: options.path,
			author: options.author,
		};
		const requestParams = { owner, repo, ...queryParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/commits', requestParams);
		return data.map((item) => ({
			sha: item.sha,
			creator: item.author.login,
			author: item.commit.author.name,
			email: item.commit.author.email,
			message: item.commit.message,
			committer: item.commit.committer.name,
			createTime: new Date(item.commit.author.date),
			avatarUrl: item.author.avatar_url,
		}));
	}

	async provideCommit(repoFullName: string, ref: string): Promise<Commit & { files?: ChangedFile[] }> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/commits/{ref}', requestParams);
		return {
			sha: data.sha,
			creator: data.author.login,
			author: data.commit.author.name,
			email: data.commit.author.email,
			message: data.commit.message,
			committer: data.commit.committer.name,
			createTime: new Date(data.commit.author.date),
			files: data.files.map((item) => ({
				path: item.filename,
				previousPath: item.previous_filename,
				status: item.status as FileChangeStatus,
			})),
			avatarUrl: data.author.avatar_url,
		};
	}

	async provideCommitChangedFiles(
		repoFullName: string,
		ref: string,
		_options: CommonQueryOptions
	): Promise<ChangedFile[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/commits/{ref}', requestParams);
		return data.files.map((item) => ({
			path: item.filename,
			previousPath: item.previous_filename,
			status: item.status as FileChangeStatus,
		}));
	}

	async provideCodeReviews(
		repoFullName: string,
		options: CommonQueryOptions & { state?: CodeReviewState; creator?: string }
	): Promise<(CodeReview & { files?: ChangedFile[] })[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const state = options.state ? (options.state === CodeReviewState.Open ? 'open' : 'closed') : 'all';
		const queryParams = { state, page: options.page, per_page: options.pageSize, creator: options.creator };
		const requestParams = { owner, repo, ...queryParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/pulls', requestParams as any);

		return data.map((item) => ({
			id: `${item.number}`,
			title: item.title,
			state: getPullState(item),
			creator: item.user.login,
			createTime: new Date(item.created_at),
			mergeTime: item.merged_at ? new Date(item.merged_at) : null,
			closeTime: item.closed_at ? new Date(item.closed_at) : null,
			head: { label: item.head.label, commitSha: item.head.sha },
			base: { label: item.base.label, commitSha: item.base.sha },
			avatarUrl: item.user.avatar_url,
		}));
	}

	async provideCodeReview(repoFullName: string, id: string): Promise<CodeReview & { files?: ChangedFile[] }> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const pullRequestParams = { owner, repo, pull_number: Number(id) };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', pullRequestParams);

		return {
			id: `${data.number}`,
			title: data.title,
			state: getPullState(data),
			creator: data.user.login,
			createTime: new Date(data.created_at),
			mergeTime: data.merged_at ? new Date(data.merged_at) : null,
			closeTime: data.closed_at ? new Date(data.closed_at) : null,
			head: { label: data.head.label, commitSha: data.head.sha },
			base: { label: data.base.label, commitSha: data.base.sha },
			avatarUrl: data.user.avatar_url,
		};
	}

	async provideCodeReviewChangedFiles(
		repoFullName: string,
		id: string,
		options: CommonQueryOptions
	): Promise<ChangedFile[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const pageParams = { per_page: options.pageSize, page: options.page };
		const filesRequestParams = { owner, repo, pull_number: Number(id), ...pageParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', filesRequestParams);

		return data.map((item) => ({
			path: item.filename,
			previousPath: item.previous_filename,
			status: item.status as FileChangeStatus,
		}));
	}

	async provideFileBlameRanges(repoFullName: string, ref: string, path: string): Promise<FileBlameRange[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref, path };
		const { data } = (await fetcher.graphql(FILE_BLAME_QUERY, requestParams)) as any;
		const blameRanges = data?.repository?.object?.blame?.ranges;

		return blameRanges?.map((item) => ({
			age: item.age as number,
			startingLine: item.startingLine as number,
			endingLine: item.endingLine as number,
			commit: {
				sha: item.commit.sha as string,
				author: item.commit.author.name as string,
				email: item.commit.author.email as string,
				message: item.commit.message as string,
				createTime: new Date(item.commit.authoredDate),
			},
		}));
	}

	provideSymbolDefinitions(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string
	): Promise<SymbolDefinitions> {
		const repoPattern = `^${escapeRegexp(`github\.com/${repoFullName}`)}$`;
		return getSymbolDefinitions(repoPattern, ref, path, line, character, symbol);
	}

	async provideSymbolReferences(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string
	): Promise<SymbolReferences> {
		const repoPattern = `^${escapeRegexp(`github\.com/${repoFullName}`)}$`;
		return getSymbolReferences(repoPattern, ref, path, line, character, symbol);
	}

	async provideSymbolHover(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		_symbol: string
	): Promise<SymbolHover | null> {
		const repoPattern = `^${escapeRegexp(`github\.com/${repoFullName}`)}$`;
		return getSymbolHover(repoPattern, ref, path, line, character);
	}

	provideUserAvatarLink(user: string): string {
		return `https://github.com/${user}.png`;
	}
}
