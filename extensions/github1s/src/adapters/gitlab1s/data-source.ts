/**
 * @file gitlab1s data-source-provider
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
import { GitLabFetcher } from './fetcher';
import { SourcegraphDataSource } from '../sourcegraph/data-source';
import { decorate, memorize } from '@/helpers/func';

const FileTypeMap = {
	blob: FileType.File,
	tree: FileType.Directory,
	commit: FileType.Submodule,
};

const getMergeRequestState = (mergeRequest: { state: string; merged_at: string | null }): CodeReviewState => {
	// current merge request is open
	if (mergeRequest.state === 'opened') {
		return CodeReviewState.Open;
	}
	// current merge request is merged
	if (mergeRequest.state === 'closed' && mergeRequest.merged_at) {
		return CodeReviewState.Merged;
	}
	// current merge is closed
	return CodeReviewState.Closed;
};

const resolveComputeAge = (timestamps: number[], ageLimit = 10) => {
	const maxTimestamp = Math.max(...timestamps);
	const minTimestamp = Math.min(...timestamps);
	const step = (maxTimestamp - minTimestamp) / ageLimit;
	return (timestamp: number) => {
		const age = Math.floor((timestamp - minTimestamp) / (step || 1));
		return (((Math.max(age, ageLimit - 1) % ageLimit) + ageLimit) % ageLimit) + 1;
	};
};

const sourcegraphDataSource = SourcegraphDataSource.getInstance('gitlab');
const trySourcegraphApiFirst = (_target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
	const originalMethod = descriptor.value;

	descriptor.value = async function <T extends (...args) => Promise<any>>(...args: Parameters<T>) {
		const gitlabFetcher = GitLabFetcher.getInstance();
		if (await gitlabFetcher.getPreferSourcegraphApi(args[0])) {
			try {
				return await sourcegraphDataSource[propertyKey](...args);
			} catch (e) {}
		}
		return originalMethod.apply(this, args);
	};
};

export class GitLab1sDataSource extends DataSource {
	private static instance: GitLab1sDataSource | null = null;
	private branchesPromiseMap: Map<string, Promise<Branch[]>> = new Map();
	private tagsPromiseMap: Map<string, Promise<Tag[]>> = new Map();
	private matchedRefsMap = new Map<string, string[]>();

	public static getInstance(): GitLab1sDataSource {
		if (GitLab1sDataSource.instance) {
			return GitLab1sDataSource.instance;
		}
		return (GitLab1sDataSource.instance = new GitLab1sDataSource());
	}

	async provideRepository(repo: string) {
		const fetcher = GitLabFetcher.getInstance();
		const { data } = await fetcher.request('GET /projects/{repo}', { repo });
		return { private: data.visibility === 'private', defaultBranch: data.default_branch };
	}

	@trySourcegraphApiFirst
	async provideDirectory(repo: string, ref: string, path: string, recursive = false): Promise<Directory> {
		const fetcher = GitLabFetcher.getInstance();
		let page = 1;
		let files = [];
		const parseTreeItem = (treeItem): DirectoryEntry => ({
			path: treeItem.path.slice(path.length),
			type: FileTypeMap[treeItem.type] || FileType.File,
			commitSha: FileTypeMap[treeItem.id] === FileType.Submodule ? treeItem.sha || 'HEAD' : undefined,
			size: treeItem.size,
		});
		while (page > 0) {
			const requestParams = { ref, page, path, repo, recursive };
			const { data, headers } = await fetcher.request(
				'GET /projects/{repo}/repository/tree?recursive={recursive}&per_page=100&page={page}&ref={ref}&path={path}',
				requestParams,
			);
			files = files.concat(data);
			const nextPage = Number(headers!.get('x-next-page'));
			page = nextPage > page ? nextPage : 0;
		}

		return {
			entries: files.map(parseTreeItem),
			truncated: false,
		};
	}

	@trySourcegraphApiFirst
	async provideFile(repo: string, ref: string, path: string): Promise<File> {
		const fetcher = GitLabFetcher.getInstance();
		const requestParams = { ref, path, repo };
		const { data } = await fetcher.request('GET /projects/{repo}/repository/files/{path}?ref={ref}', requestParams);
		return { content: toUint8Array((data as any).content) };
	}

	@decorate(memorize)
	async getBranches(repo: string, ref: 'heads' | 'tags'): Promise<Branch[] | Tag[]> {
		const fetcher = GitLabFetcher.getInstance();
		const requestParams = { repo, ref };
		const { data } = await fetcher.request('GET /projects/{repo}/repository/branches', requestParams);
		return data.map((item) => ({
			name: item.name,
			commitSha: item.commit.id,
			description: `${ref === 'heads' ? 'Branch' : 'Tag'} at ${item.commit.short_id}`,
		}));
	}

	@decorate(memorize)
	async getTags(repo: string, ref: 'heads' | 'tags'): Promise<Branch[] | Tag[]> {
		const fetcher = GitLabFetcher.getInstance();
		const requestParams = { repo, ref };
		const { data } = await fetcher.request('GET /projects/{repo}/repository/tags', requestParams);
		return data.map((item) => ({
			name: item.name,
			commitSha: item.commit.id,
			description: `${ref === 'heads' ? 'Branch' : 'Tag'} at ${item.commit.short_id}`,
		}));
	}

	@decorate(memorize)
	async getDefaultBranch(repo: string) {
		return (await this.provideRepository(repo))?.defaultBranch || 'HEAD';
	}

	@trySourcegraphApiFirst
	async extractRefPath(repo: string, refAndPath: string): Promise<{ ref: string; path: string }> {
		if (!refAndPath) {
			return { ref: await this.getDefaultBranch(repo), path: '' };
		}
		if (refAndPath.match(/^HEAD(\/.*)?$/i)) {
			return { ref: 'HEAD', path: refAndPath.slice(5) };
		}
		if (!this.matchedRefsMap.has(repo)) {
			this.matchedRefsMap.set(repo, []);
		}
		const matchPathRef = (ref) => refAndPath.startsWith(`${ref}/`) || refAndPath === ref;
		const pathRef = this.matchedRefsMap.get(repo)?.find(matchPathRef);
		if (pathRef) {
			return { ref: pathRef, path: refAndPath.slice(pathRef.length + 1) };
		}
		const [branches, tags] = await this.prepareAllRefs(repo);
		const exactRef = [...branches, ...tags].map((item) => item.name).find(matchPathRef);
		const ref = exactRef || refAndPath.split('/')[0] || 'HEAD';
		exactRef && this.matchedRefsMap.get(repo)?.push(ref);
		return { ref, path: refAndPath.slice(ref.length + 1) };
	}

	async prepareAllRefs(repo: string) {
		return Promise.all([this.provideBranches(repo), this.provideTags(repo)]);
	}

	@trySourcegraphApiFirst
	async provideBranches(repo: string, options?: CommonQueryOptions): Promise<Branch[]> {
		if (!this.branchesPromiseMap.has(repo)) {
			this.branchesPromiseMap.set(repo, this.getBranches(repo, 'heads'));
		}
		return this.branchesPromiseMap.get(repo)!.then((branches) => {
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
	async provideBranch(repo: string, branchName: string): Promise<Branch | null> {
		const branches = await this.provideBranches(repo);
		return branches.find((item) => item.name === branchName) || null;
	}

	@trySourcegraphApiFirst
	async provideTags(repoFullName: string, options?: CommonQueryOptions): Promise<Tag[]> {
		if (!this.tagsPromiseMap.has(repoFullName)) {
			this.tagsPromiseMap.set(repoFullName, this.getTags(repoFullName, 'tags'));
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
	async provideCommits(repo: string, options?: CommitsQueryOptions): Promise<(Commit & { files?: ChangedFile[] })[]> {
		const fetcher = GitLabFetcher.getInstance();
		const queryParams = {
			page: options?.page,
			per_page: options?.pageSize,
			sha: options?.from,
			path: options?.path,
			author: options?.author,
		};
		const requestParams = { repo, ...queryParams };
		const { data } = await fetcher.request(
			'GET /projects/{repo}/repository/commits?per_page={per_page}&page={page}&path={path}&ref_name={sha}',
			requestParams,
		);
		return Promise.all(
			data.map(async (item) => ({
				sha: item.id,
				author: item.author_name,
				email: item.author_email,
				message: item.message,
				committer: item.committer_name,
				createTime: item.created_at ? new Date(item.created_at) : undefined,
				parents: item.parent_ids.map((parent) => parent) || [],
				avatarUrl: item.author?.avatar_url || (await this.provideUserAvatarLink(item.author_name)),
			})),
		);
	}

	@trySourcegraphApiFirst
	async provideCommit(repo: string, ref: string): Promise<Commit & { files?: ChangedFile[] }> {
		const fetcher = GitLabFetcher.getInstance();
		const requestParams = { repo, ref };
		const { data } = await fetcher.request('GET /projects/{repo}/repository/commits/{ref}', requestParams);
		return {
			sha: data.id,
			author: data.author_name,
			email: data.author_email,
			message: data.message,
			committer: data.committer_name,
			createTime: data.created_at ? new Date(data.created_at) : undefined,
			parents: data.parent_ids || [],
			files: data.files?.map((item) => ({
				path: item.filename || item.previous_filename!,
				previousPath: item.previous_filename,
				status: item.status as FileChangeStatus,
			})),
			avatarUrl: data?.avatar_url,
		};
	}

	@trySourcegraphApiFirst
	async provideCommitChangedFiles(repo: string, ref: string, _options?: CommonQueryOptions): Promise<ChangedFile[]> {
		const fetcher = GitLabFetcher.getInstance();
		const requestParams = { repo, ref };
		const { data } = await fetcher.request('GET /projects/{repo}/repository/commits/{ref}/diff', requestParams);
		return (
			data?.map((item) => ({
				path: item.new_path || item.old_path!,
				previousPath: item.old_path,
				status: item.new_file
					? FileChangeStatus.Added
					: item.deleted_file
						? FileChangeStatus.Removed
						: item.renamed_file
							? FileChangeStatus.Renamed
							: FileChangeStatus.Modified,
			})) || []
		);
	}

	async provideCodeReviews(
		repo: string,
		options?: CodeReviewsQueryOptions,
	): Promise<(CodeReview & { files?: ChangedFile[] })[]> {
		const fetcher = GitLabFetcher.getInstance();
		const state = options?.state ? (options.state === CodeReviewState.Open ? 'open' : 'closed') : 'all';
		// per_page=100&page={page}
		const queryParams = { state, page: options?.page, per_page: options?.pageSize, creator: options?.creator };
		const requestParams = { repo, ...queryParams };
		const { data } = await fetcher.request(
			'GET /projects/{repo}/merge_requests?per_page={per_page}&page={page}',
			requestParams as any,
		);

		return data.map((item) => ({
			id: `${item.iid}`,
			title: item.title,
			state: getMergeRequestState(item),
			creator: item.author?.name || item.author?.username,
			createTime: new Date(item.created_at),
			mergeTime: item.merged_at ? new Date(item.merged_at) : null,
			closeTime: item.closed_at ? new Date(item.closed_at) : null,
			source: item.source_branch,
			target: item.target_branch,
			avatarUrl: item.author?.avatar_url,
		}));
	}

	async provideCodeReview(repo: string, id: string) {
		const fetcher = GitLabFetcher.getInstance();
		const requestParams = { repo, id };
		const { data } = await fetcher.request('GET /projects/{repo}/merge_requests/{id}', requestParams);

		return {
			id: `${data.iid}`,
			title: data.title,
			state: getMergeRequestState(data),
			creator: data.author?.name || data.author?.username,
			createTime: new Date(data.created_at),
			mergeTime: data.merged_at ? new Date(data.merged_at) : null,
			closeTime: data.closed_at ? new Date(data.closed_at) : null,
			source: data.source_branch,
			target: data.target_branch,
			sourceSha: data.diff_refs.head_sha,
			targetSha: data.diff_refs.base_sha,
			avatarUrl: data.author?.avatar_url,
		};
	}

	async provideCodeReviewChangedFiles(repo: string, id: string, options?: CommonQueryOptions): Promise<ChangedFile[]> {
		const fetcher = GitLabFetcher.getInstance();
		const pageParams = { per_page: options?.pageSize, page: options?.page };
		const filesRequestParams = { repo, id, ...pageParams };
		const { data } = await fetcher.request(
			'GET /projects/{repo}/merge_requests/{id}/changes?per_page={per_page}&page={page}',
			filesRequestParams,
		);

		return data.changes.map((item) => ({
			path: item.new_path,
			previousPath: item.old_path,
			status: item.new_file
				? FileChangeStatus.Added
				: item.deleted_file
					? FileChangeStatus.Removed
					: item.renamed_file
						? FileChangeStatus.Renamed
						: FileChangeStatus.Modified,
		}));
	}

	@trySourcegraphApiFirst
	async provideFileBlameRanges(repo: string, ref: string, path: string): Promise<BlameRange[]> {
		const fetcher = GitLabFetcher.getInstance();
		const requestParams = { repo, ref, path };
		const { data } = await fetcher.request(
			'GET /projects/{repo}/repository/files/{path}/blame?ref={ref}',
			requestParams,
		);
		let startLine = 1;
		const timestamps = data.map(({ commit }) => +new Date(commit.authored_date) || 0);
		const computeAge = resolveComputeAge(timestamps);
		return (data || []).map(({ commit, lines }) => {
			const startingLine = startLine;
			const endingLine = startingLine + lines.length;
			startLine = endingLine + 1;
			return {
				age: computeAge(+new Date(commit?.authored_date) || 0),
				startingLine,
				endingLine,
				commit: {
					sha: commit?.id as string,
					author: commit?.author_name as string,
					email: commit?.author_email as string,
					message: commit?.message as string,
					createTime: new Date(commit?.authored_date),
					avatarUrl: this.provideUserAvatarLink(encodeURIComponent(commit?.author?.name)),
				},
			};
		});
	}

	async getAvatar(email): Promise<string> {
		const fetcher = GitLabFetcher.getInstance();
		const { data } = await fetcher.request('GET /avatar?email={email}', { email });
		return data.avatar_url;
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
		return `https://www.gravatar.com/avatar/${user}?d=identicon`;
	}
}
