/**
 * @file sourcegraph data-source-provider
 * @author netcon
 */

import { joinPath } from '@/helpers/util';
import { matchSorter } from 'match-sorter';
import {
	Branch,
	TextSearchOptions,
	Commit,
	CommonQueryOptions,
	DataSource,
	Directory,
	File,
	BlameRange,
	Tag,
	TextSearchResults,
	TextSearchQuery,
	ChangedFile,
	SymbolHover,
	SymbolReferences,
	SymbolDefinitions,
	CommitsQueryOptions,
	FileType,
} from '../types';
import { getFileBlameRanges } from './blame';
import { getCommit, getCommits } from './commit';
import { compareCommits } from './comparison';
import { getSymbolDefinitions } from './definition';
import { readDirectory, readFile } from './file';
import { getSymbolHover } from './hover';
import { getAllRefs } from './ref';
import { getSymbolReferences } from './reference';
import { getRepository } from './repository';
import { getTextSearchResults } from './search';
import { decorate, memorize } from '@/helpers/func';

type SupportedPlatform = 'github' | 'gitlab' | 'bitbucket';

export class SourcegraphDataSource extends DataSource {
	private static instanceMap: Map<SupportedPlatform, SourcegraphDataSource> = new Map();
	private refsPromiseMap: Map<string, Promise<{ branches: Branch[]; tags: Tag[] }>> = new Map();
	private repositoryPromiseMap: Map<string, Promise<{ private: boolean; defaultBranch: string } | null>> = new Map();
	private fileTypeMap: Map<string, FileType> = new Map(); // cache if path is a directory
	private matchedRefsMap: Map<string, string[]> = new Map();
	private textEncoder = new TextEncoder();

	public static getInstance(platform: SupportedPlatform): SourcegraphDataSource {
		if (!SourcegraphDataSource.instanceMap.has(platform)) {
			SourcegraphDataSource.instanceMap.set(platform, new SourcegraphDataSource(platform));
		}
		return SourcegraphDataSource.instanceMap.get(platform)!;
	}

	private constructor(private platform: SupportedPlatform) {
		super();
	}

	buildRepository(repo: string) {
		if (this.platform === 'github') {
			return `github.com/${repo}`;
		}
		if (this.platform === 'gitlab') {
			return `gitlab.com/${repo}`;
		}
		if (this.platform === 'bitbucket') {
			return `bitbucket.org/${repo}`;
		}
		return repo;
	}

	async provideDirectory(repo: string, ref: string, path: string, recursive = false): Promise<Directory> {
		const directories = await readDirectory(this.buildRepository(repo), ref, path, recursive);
		directories.entries.forEach((entry) => {
			const mapKey = `${repo} ${ref} ${joinPath(path, entry.path)}`;
			this.fileTypeMap.set(mapKey, entry.type);
		});
		return directories;
	}

	async detectPathFileType(repo: string, ref: string, path: string) {
		const pathParts = path.split('/').filter(Boolean);
		const trimmedPath = pathParts.join('/');
		if (!trimmedPath) {
			return FileType.Directory;
		}
		const mapKey = `${repo} ${ref} ${trimmedPath}`;
		if (this.fileTypeMap.has(mapKey)) {
			return this.fileTypeMap.get(mapKey)!;
		}
		await this.provideDirectory(repo, ref, pathParts.slice(0, -1).join('/'), false);
		return this.fileTypeMap.get(trimmedPath) || FileType.File;
	}

	async provideRepository(repo: string) {
		if (!this.repositoryPromiseMap.has(repo)) {
			this.repositoryPromiseMap.set(repo, getRepository(this.buildRepository(repo)));
		}
		return this.repositoryPromiseMap.get(repo);
	}

	async provideFile(repo: string, ref: string, path: string): Promise<File> {
		// sourcegraph api break binary files and text coding, so we use github api first here
		if (this.platform === 'github') {
			// For GitHub repositories, request GitHub User Content API first (it seems no Rate Limit),
			// because Sourcegraph API returns binary data such as pictures in error. If the GitHub User
			// Content API goes wrong, then try Sourcegraph API. Use `try catch` because if fallback to
			// GitHub REST API may trigger a pop-up window to request authentication for anonymous users.
			try {
				return fetch(encodeURI(`https://raw.githubusercontent.com/${repo}/${ref}/${path}`))
					.then((response) => (response.ok ? response.arrayBuffer() : Promise.reject({ response })))
					.then((buffer) => ({ content: new Uint8Array(buffer) }));
			} catch {}
		}
		// TODO: support binary files for other platforms
		const { content } = await readFile(this.buildRepository(repo), ref, path);
		return { content: this.textEncoder.encode(content) };
	}

	async prepareAllRefs(repo: string) {
		if (!this.refsPromiseMap.has(repo)) {
			this.refsPromiseMap.set(repo, getAllRefs(this.buildRepository(repo)));
		}
		return this.refsPromiseMap.get(repo)!;
	}

	@decorate(memorize)
	private async getDefaultBranch(repo: string) {
		return (await this.provideRepository(repo))?.defaultBranch || 'HEAD';
	}

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
		const { branches, tags } = await this.prepareAllRefs(repo);
		const exactRef = [...branches, ...tags].map((item) => item.name).find(matchPathRef);
		const ref = exactRef || refAndPath.split('/')[0] || 'HEAD';
		exactRef && this.matchedRefsMap.get(repo)?.push(ref);
		return { ref, path: refAndPath.slice(ref.length + 1) };
	}

	async provideBranches(repo: string, options?: CommonQueryOptions): Promise<Branch[]> {
		const cachedRefs = await this.prepareAllRefs(repo);
		const matchedBranches = options?.query
			? matchSorter(cachedRefs?.branches || [], options.query, { keys: ['name'] })
			: cachedRefs?.branches || [];
		if (options?.pageSize) {
			const page = options.page || 1;
			const pageSize = options.pageSize;
			return matchedBranches.slice(pageSize * (page - 1), pageSize * page);
		}
		return matchedBranches;
	}

	async provideTags(repo: string, options?: CommonQueryOptions): Promise<Tag[]> {
		const cachedRefs = await this.prepareAllRefs(repo);
		const matchedTags = options?.query
			? matchSorter(cachedRefs?.tags || [], options.query, { keys: ['name'] })
			: cachedRefs?.tags || [];
		if (options?.pageSize) {
			const page = options.page || 1;
			const pageSize = options.pageSize;
			return matchedTags.slice(pageSize * (page - 1), pageSize * page);
		}
		return matchedTags;
	}

	async provideTextSearchResults(
		repo: string,
		ref: string,
		query: TextSearchQuery,
		options: TextSearchOptions,
	): Promise<TextSearchResults> {
		return getTextSearchResults(this.buildRepository(repo), ref, query, options);
	}

	async provideCommits(repo: string, options?: CommitsQueryOptions): Promise<(Commit & { files?: ChangedFile[] })[]> {
		let commits = await getCommits(
			this.buildRepository(repo),
			options?.from || 'HEAD',
			options?.path,
			options?.pageSize ? options.pageSize * (options.page || 1) : undefined,
		);
		if (options?.path && commits.length) {
			// find the latested that related the `options.path` file
			const changedFiles = await this.provideCommitChangedFiles(repo, commits[0].sha);
			commits = changedFiles.find((file) => file.path === options.path) ? commits : commits.slice(1);
		}
		return options?.pageSize ? commits.slice(options.pageSize * ((options.page || 1) - 1)) : commits;
	}

	async provideCommit(repo: string, ref: string): Promise<Commit | null> {
		return getCommit(this.buildRepository(repo), ref);
	}

	async provideCommitChangedFiles(repo: string, ref: string, _options?: CommonQueryOptions): Promise<ChangedFile[]> {
		return compareCommits(this.buildRepository(repo), `${ref}~`, ref);
	}

	async provideFileBlameRanges(repo: string, ref: string, path: string): Promise<BlameRange[]> {
		return getFileBlameRanges(this.buildRepository(repo), ref, path);
	}

	async provideSymbolDefinitions(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string,
	): Promise<SymbolDefinitions> {
		return getSymbolDefinitions(this.buildRepository(repo), ref, path, line, character, symbol);
	}

	async provideSymbolReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string,
	): Promise<SymbolReferences> {
		return getSymbolReferences(this.buildRepository(repo), ref, path, line, character, symbol);
	}

	async provideSymbolHover(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		_symbol: string,
	): Promise<SymbolHover | null> {
		return getSymbolHover(this.buildRepository(repo), ref, path, line, character);
	}

	provideUserAvatarLink(user: string): string {
		if (this.platform === 'github') {
			return `https://github.com/${user}.png`;
		}
		return `https://www.gravatar.com/avatar/${user}?d=identicon`;
	}
}
