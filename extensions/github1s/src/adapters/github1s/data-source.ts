/**
 * @file github1s data-source-provider
 * @author conwnet
 */

import {
	Branch,
	ChangedFileList,
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
	private static instance: GitHub1sDataSource = null;
	private cachedBranches: Branch[] = null;
	private cachedTags: Branch[] = null;

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
	): Promise<Commit[]> {
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
			author: item.commit.author.name,
			email: item.commit.author.email,
			message: item.commit.message,
			committer: item.commit.committer.name,
			createTime: new Date(item.commit.author.date),
		}));
	}

	async provideCommit(repoFullName: string, ref: string): Promise<Commit & ChangedFileList> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/commits/{ref}', requestParams);
		return {
			sha: data.sha,
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
		};
	}

	async provideCodeReviews(
		repoFullName: string,
		options: CommonQueryOptions & { state?: CodeReviewState; creator?: string }
	): Promise<CodeReview[]> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const state = options.state ? (options.state === CodeReviewState.Open ? 'open' : 'closed') : 'all';
		const queryParams = { state, page: options.page, per_page: options.pageSize, owner: options.creator };
		const requestParams = { owner, repo, ...queryParams };
		const { data } = await fetcher.request('GET /repos/{owner}/{repo}/pulls', requestParams as any);

		return data.map((item) => ({
			id: `${item.id}`,
			title: item.title,
			state: getPullState(item),
			creator: item.user.login,
			createTime: new Date(item.created_at),
			mergeTime: item.merged_at ? new Date(item.merged_at) : null,
			closeTime: item.closed_at ? new Date(item.closed_at) : null,
			head: { label: item.head.label, commitSha: item.head.sha },
			base: { label: item.base.label, commitSha: item.base.sha },
		}));
	}

	async provideCodeReview(repoFullName: string, id: string): Promise<CodeReview & ChangedFileList> {
		const fetcher = GitHubFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const pullRequestParams = { owner, repo, pull_number: Number(id) };
		// TODO: only the number of change files not greater than 100 are supported now!
		const filesRequestParams = { ...pullRequestParams, per_page: 100 };
		const pullPromise = fetcher.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', pullRequestParams);
		const filesPromise = fetcher.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', filesRequestParams);
		const [pullResponse, filesResponse] = await Promise.all([pullPromise, filesPromise]);

		return {
			id: `${pullResponse.data.id}`,
			title: pullResponse.data.title,
			state: getPullState(pullResponse.data),
			creator: pullResponse.data.user.login,
			createTime: new Date(pullResponse.data.created_at),
			mergeTime: pullResponse.data.merged_at ? new Date(pullResponse.data.merged_at) : null,
			closeTime: pullResponse.data.closed_at ? new Date(pullResponse.data.closed_at) : null,
			head: { label: pullResponse.data.head.label, commitSha: pullResponse.data.head.sha },
			base: { label: pullResponse.data.base.label, commitSha: pullResponse.data.base.sha },
			files: filesResponse.data.map((item) => ({
				path: item.filename,
				previousPath: item.previous_filename,
				status: item.status as FileChangeStatus,
			})),
		};
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
		symbol: string
	): Promise<{ markdown: string; precise: boolean }> {
		throw new Error('Method not implemented.');
	}

	provideUserAvatarLink(user: string): string {
		return `https://github.com/${user}.png`;
	}
}
