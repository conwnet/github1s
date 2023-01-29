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
// import { FILE_BLAME_QUERY } from './graphql';
import { GitLabFetcher } from './fetcher';
import { SourcegraphDataSource } from '../sourcegraph/data-source';

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
	if (pull.state === 'opened') {
		return CodeReviewState.Open;
	}
	// current pull request is merged
	if (pull.state === 'closed' && pull.merged_at) {
		return CodeReviewState.Merged;
	}
	// current pull is closed
	return CodeReviewState.Merged;
};

const sourcegraphDataSource = SourcegraphDataSource.getInstance('gitlab');
const trySourcegraphApiFirst = (_target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
	const originalMethod = descriptor.value;

	descriptor.value = async function <T extends (...args) => Promise<any>>(...args: Parameters<T>) {
		// return originalMethod.apply(this, args);
		const githubFetcher = GitLabFetcher.getInstance();
		if (await githubFetcher.useSourcegraphApiFirst(args[0])) {
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
	private refPathPromiseMap: Map<string, Promise<{ ref: string; path: string }>> = new Map();
	private matchedRefsMap = new Map<string, string[]>();
	private avatarPromiseMap = new Map<string, Promise<string>>();

	public static getInstance(): GitLab1sDataSource {
		if (GitLab1sDataSource.instance) {
			return GitLab1sDataSource.instance;
		}
		return (GitLab1sDataSource.instance = new GitLab1sDataSource());
	}

	async provideRepository(repoFullName: string) {
		if (!this.branchesPromiseMap.has(repoFullName)) {
			await this.provideBranches(repoFullName);
		}
		return this.branchesPromiseMap.get(repoFullName)?.then((branches) => {
			const defaultBranch = branches.find((br) => br.isDefault);
			if (defaultBranch) {
				return { name: defaultBranch.name, defaultBranch: defaultBranch?.name };
			}
		});
	}

	@trySourcegraphApiFirst
	async provideDirectory(repoFullName: string, ref: string, path: string, recursive = false): Promise<Directory> {
		const fetcher = GitLabFetcher.getInstance();
		const encodedPath = encodeFilePath(path);
		let page = 1;
		let files = [];
		const parseTreeItem = (treeItem): DirectoryEntry => ({
			path: treeItem.path,
			type: FileTypeMap[treeItem.type] || FileType.File,
			commitSha: FileTypeMap[treeItem.id] === FileType.Submodule ? treeItem.sha || 'HEAD' : undefined,
			size: treeItem.size,
		});
		while (page > 0) {
			const requestParams = {
				ref,
				page,
				path: encodedPath,
				...parseRepoFullName(repoFullName),
			};
			const { data, headers } = await fetcher.request(
				'GET /projects/{owner}%2F{repo}/repository/tree?recursive=true&per_page=100&page={page}&ref={ref}',
				requestParams
			);
			files = files.concat(data);
			page = Number(headers!.get('x-next-page'));
		}

		return {
			entries: files.map(parseTreeItem),
			truncated: false,
		};
	}

	@trySourcegraphApiFirst
	async provideFile(repoFullName: string, ref: string, path: string): Promise<File> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref, path: encodeURIComponent(path) };
		const { data } = await fetcher.request(
			'GET /projects/{owner}%2F{repo}/repository/files/{path}?ref={ref}',
			requestParams
		);
		return { content: toUint8Array((data as any).content) };
	}

	@trySourcegraphApiFirst
	async getBranches(repoFullName: string, ref: 'heads' | 'tags'): Promise<Branch[] | Tag[]> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /projects/{owner}%2F{repo}/repository/branches', requestParams);
		return data.map((item) => ({
			name: item.name,
			commitSha: item.commit.id,
			description: `${ref === 'heads' ? 'Branch' : 'Tag'} at ${item.commit.short_id}`,
			isDefault: item.default,
		}));
	}

	@trySourcegraphApiFirst
	async getTags(repoFullName: string, ref: 'heads' | 'tags'): Promise<Branch[] | Tag[]> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /projects/{owner}%2F{repo}/repository/tags', requestParams);
		return data.map((item) => ({
			name: item.name,
			commitSha: item.commit.id,
			description: `${ref === 'heads' ? 'Branch' : 'Tag'} at ${item.commit.short_id}`,
		}));
	}

	// @trySourcegraphApiFirst
	// async extractRefPath(repoFullName: string, refAndPath: string): Promise<{ ref: string; path: string }> {
	// 	if (!this.matchedRefsMap.has(repoFullName)) {
	// 		this.matchedRefsMap.set(repoFullName, []);
	// 	}
	// 	const matchPathRef = (ref) => refAndPath.startsWith(`${ref}/`) || refAndPath === ref;
	// 	const matchedRef = this.matchedRefsMap.get(repoFullName)?.find(matchPathRef);
	// 	if (matchedRef) {
	// 		return { ref: matchedRef, path: refAndPath.slice(matchedRef.length + 1) };
	// 	}
	// 	const mapKey = `${repoFullName} ${refAndPath}`;
	// 	if (!this.refPathPromiseMap.has(mapKey)) {
	// 		const refPathPromise = new Promise<{ ref: string; path: string }>(async (resolve, reject) => {
	// 			if (!refAndPath || refAndPath.match(/^HEAD(\/.*)?$/i)) {
	// 				return resolve({ ref: 'HEAD', path: refAndPath.slice(5) });
	// 			}

	// 			const fetcher = GitHubFetcher.getInstance();
	// 			const { owner, repo } = parseRepoFullName(repoFullName);
	// 			const requestParams = { owner, repo, refAndPath };
	// 			const requestUrl = `GET /projects/{owner}%2F{repo}/git/extract-ref/{refAndPath}`;
	// 			const response = await fetcher.request(requestUrl, requestParams).catch(reject);
	// 			response?.data?.ref && this.matchedRefsMap.get(repoFullName)?.push(response.data.ref);
	// 			return resolve(response?.data || { ref: 'HEAD', path: '' });
	// 		});
	// 		this.refPathPromiseMap.set(mapKey, refPathPromise);
	// 	}
	// 	return this.refPathPromiseMap.get(mapKey)!;
	// }

	@trySourcegraphApiFirst
	async extractRefPath(repoFullName: string, refAndPath: string): Promise<{ ref: string; path: string }> {
		if (!refAndPath || refAndPath.match(/^HEAD(\/.*)?$/i)) {
			return { ref: 'HEAD', path: refAndPath.slice(5) };
		}
		if (!this.matchedRefsMap.has(repoFullName)) {
			this.matchedRefsMap.set(repoFullName, []);
		}
		const matchPathRef = (ref) => refAndPath.startsWith(`${ref}/`) || refAndPath === ref;
		const pathRef = this.matchedRefsMap.get(repoFullName)?.find(matchPathRef);
		if (pathRef) {
			return { ref: pathRef, path: refAndPath.slice(pathRef.length + 1) };
		}
		const [branches, tags] = await this.prepareAllRefs(repoFullName);
		const exactRef = [...branches, ...tags].map((item) => item.name).find(matchPathRef);
		const ref = exactRef || refAndPath.split('/')[0] || 'HEAD';
		exactRef && this.matchedRefsMap.get(repoFullName)?.push(ref);
		return { ref, path: refAndPath.slice(ref.length + 1) };
	}

	async prepareAllRefs(repoFullName: string) {
		return Promise.all([this.provideBranches(repoFullName), this.provideTags(repoFullName)]);
	}

	@trySourcegraphApiFirst
	async provideBranches(repoFullName: string, options?: CommonQueryOptions): Promise<Branch[]> {
		if (!this.branchesPromiseMap.has(repoFullName)) {
			this.branchesPromiseMap.set(repoFullName, this.getBranches(repoFullName, 'heads'));
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
		options: TextSearchOptions
	): Promise<TextSearchResults> {
		return sourcegraphDataSource.provideTextSearchResults(repoFullName, ref, query, options);
	}

	@trySourcegraphApiFirst
	async provideCommits(
		repoFullName: string,
		options?: CommitsQueryOptions
	): Promise<(Commit & { files?: ChangedFile[] })[]> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const queryParams = {
			page: options?.page,
			per_page: options?.pageSize,
			sha: options?.from,
			path: options?.path,
			author: options?.author,
		};
		const requestParams = { owner, repo, ...queryParams };
		const { data } = await fetcher.request(
			'GET /projects/{owner}%2F{repo}/repository/commits?per_page={per_page}&page={page}&path={path}&ref_name={sha}',
			requestParams
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
				avatarUrl: item.author?.avatar_url || (await this.getAvatars(item.author_email)),
			}))
		);
	}

	@trySourcegraphApiFirst
	async provideCommit(repoFullName: string, ref: string): Promise<Commit & { files?: ChangedFile[] }> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request('GET /projects/{owner}%2F{repo}/repository/commits/{ref}', requestParams);
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
	async provideCommitChangedFiles(
		repoFullName: string,
		ref: string,
		_options?: CommonQueryOptions
	): Promise<ChangedFile[]> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref };
		const { data } = await fetcher.request(
			'GET /projects/{owner}%2F{repo}/repository/commits/{ref}/diff',
			requestParams
		);
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
		repoFullName: string,
		options?: CodeReviewsQueryOptions
	): Promise<(CodeReview & { files?: ChangedFile[] })[]> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const state = options?.state ? (options.state === CodeReviewState.Open ? 'open' : 'closed') : 'all';
		// per_page=100&page={page}
		const queryParams = { state, page: options?.page, per_page: options?.pageSize, creator: options?.creator };
		const requestParams = { owner, repo, ...queryParams };
		const { data } = await fetcher.request(
			'GET /projects/{owner}%2F{repo}/merge_requests?per_page={per_page}&page={page}',
			requestParams as any
		);

		return data.map((item) => ({
			id: `${item.iid}`,
			title: item.title,
			state: getPullState(item),
			creator: item.author?.name || item.author?.username,
			createTime: new Date(item.created_at),
			// 有些版本没有merged_at字段
			mergeTime: item.merged_at ? new Date(item.merged_at) : item.updated_at ? new Date(item.updated_at) : null,
			closeTime: item.closed_at ? new Date(item.closed_at) : null,
			head: { label: item.labels[0], commitSha: item.sha },
			base: { label: item.labels[1], commitSha: '' }, // 获取changes时填充
			avatarUrl: item.author?.avatar_url,
		}));
	}

	async provideCodeReview(repoFullName: string, id: string): Promise<CodeReview & { files?: ChangedFile[] }> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const pullRequestParams = { owner, repo, pull_number: Number(id) };
		const { data } = await fetcher.request(
			'GET /projects/{owner}%2F{repo}/merge_requests/{pull_number}',
			pullRequestParams
		);

		return {
			id: `${data.iid}`,
			title: data.title,
			state: getPullState(data),
			creator: data.author?.name || data.author?.username,
			createTime: new Date(data.created_at),
			mergeTime: data.merged_at ? new Date(data.merged_at) : null,
			closeTime: data.closed_at ? new Date(data.closed_at) : null,
			head: { label: data.labels[0], commitSha: data.diff_refs.head_sha },
			base: { label: data.labels[1], commitSha: data.diff_refs.base_sha },
			avatarUrl: data.author?.avatar_url,
		};
	}

	async provideCodeReviewChangedFiles(
		repoFullName: string,
		id: string,
		options?: CommonQueryOptions
	): Promise<ChangedFile[]> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const pageParams = { per_page: options?.pageSize, page: options?.page };
		const filesRequestParams = { owner, repo, pull_number: Number(id), ...pageParams };
		const { data } = await fetcher.request(
			'GET /projects/{owner}%2F{repo}/merge_requests/{pull_number}/changes?per_page={per_page}&page={page}',
			filesRequestParams
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
			head: data.diff_refs.head_sha,
			base: data.diff_refs.base_sha,
		}));
	}

	// @trySourcegraphApiFirst
	// async provideFileBlameRanges(repoFullName: string, ref: string, path: string): Promise<BlameRange[]> {
	// 	const fetcher = GitHubFetcher.getInstance();
	// 	const { owner, repo } = parseRepoFullName(repoFullName);
	// 	const requestParams = { owner, repo, ref, path };
	// 	const { data } = await fetcher.graphql(FILE_BLAME_QUERY, requestParams);
	// 	const blameRanges = (data as any)?.repository?.object?.blame?.ranges;

	// 	return (blameRanges || []).map((item) => ({
	// 		age: item.age as number,
	// 		startingLine: item.startingLine as number,
	// 		endingLine: item.endingLine as number,
	// 		commit: {
	// 			sha: item.commit?.sha as string,
	// 			author: item.commit?.author?.name as string,
	// 			email: item.commit?.author?.email as string,
	// 			message: item.commit?.message as string,
	// 			createTime: new Date(item.commit?.authoredDate),
	// 			avatarUrl: item.commit?.author?.avatarUrl as string,
	// 		},
	// 	}));
	// }

	@trySourcegraphApiFirst
	async provideFileBlameRanges(repoFullName: string, ref: string, path: string): Promise<BlameRange[]> {
		const fetcher = GitLabFetcher.getInstance();
		const { owner, repo } = parseRepoFullName(repoFullName);
		const requestParams = { owner, repo, ref, path: encodeURIComponent(path) };
		const { data } = await fetcher.request(
			'GET /projects/{owner}%2F{repo}/repository/files/{path}/blame?ref={ref}',
			requestParams
		);
		let startLine = 1;
		return Promise.all(
			(data || []).map(async (item) => {
				let startingLine = startLine;
				let endingLine = startingLine + item.lines.length;
				startLine = endingLine + 1;
				return {
					// age: item.age as number,
					startingLine,
					endingLine,
					commit: {
						sha: item.commit?.id as string,
						author: item.commit?.author_name as string,
						email: item.commit?.author_email as string,
						message: item.commit?.message as string,
						createTime: new Date(item.commit?.authored_date),
						avatarUrl: item.commit?.avatar_url || (await this.getAvatars(item.commit?.author_email)),
					},
				};
			})
		);
	}

	async getAvatars(email: string) {
		if (this.avatarPromiseMap.has(email)) {
			return this.avatarPromiseMap.get(email);
		}

		this.avatarPromiseMap.set(email, this.getAvatar(email));
		return this.avatarPromiseMap.get(email);
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
		symbol: string
	): Promise<SymbolDefinitions> {
		return sourcegraphDataSource.provideSymbolDefinitions(repoFullName, ref, path, line, character, symbol);
	}

	async provideSymbolReferences(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string
	): Promise<SymbolReferences> {
		return sourcegraphDataSource.provideSymbolReferences(repoFullName, ref, path, line, character, symbol);
	}

	async provideSymbolHover(
		repoFullName: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		_symbol: string
	): Promise<SymbolHover | null> {
		return sourcegraphDataSource.provideSymbolHover(repoFullName, ref, path, line, character, _symbol);
	}

	provideUserAvatarLink(user: string): string {
		return ``;
	}
}
