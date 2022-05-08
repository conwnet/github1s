/**
 * @file sourcegraph data-source-provider
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
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

type SupportedPlatfrom = 'github' | 'gitlab' | 'bitbucket';

const escapeRegexp = (text: string): string => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export class SourcegraphDataSource extends DataSource {
	private static instanceMap: Map<SupportedPlatfrom, SourcegraphDataSource> = new Map();
	private cachedRefs: { branches: Branch[]; tags: Tag[] } | null = null;
	private textEncodder = new TextEncoder();

	public static getInstance(platfrom: SupportedPlatfrom): SourcegraphDataSource {
		if (!SourcegraphDataSource.instanceMap.has(platfrom)) {
			SourcegraphDataSource.instanceMap.set(platfrom, new SourcegraphDataSource(platfrom));
		}
		return SourcegraphDataSource.instanceMap.get(platfrom)!;
	}

	private constructor(private platform: SupportedPlatfrom) {
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
			return `bitbucket.com/${repo}`;
		}
		return repo;
	}

	buildRepoPattern(repo: string) {
		return `^${escapeRegexp(this.buildRepository(repo))}$`;
	}

	provideDirectory(repo: string, ref: string, path: string, recursive: boolean): Promise<Directory> {
		return readDirectory(this.buildRepository(repo), ref, path, recursive);
	}

	async provideRepository(repo: string) {
		return getRepository(this.buildRepository(repo));
	}

	async provideFile(repo: string, ref: string, path: string): Promise<File> {
		const { content, binary } = await readFile(this.buildRepository(repo), ref, path);
		// sourcegraph api break binary files, so we use github api here
		// TODO: fix fetch binary files in gitlab/bitbucket
		if (binary && this.platform === 'github') {
			return fetch(`https://raw.githubusercontent.com/${repo}/${ref}/${path}`)
				.then((response) => response.arrayBuffer())
				.then((buffer) => ({ content: new Uint8Array(buffer) }));
		}
		return { content: this.textEncodder.encode(content) };
	}

	prepareAllRefs = reuseable(async (repo: string) => {
		const { branches, tags } = await getAllRefs(this.buildRepository(repo));
		return (this.cachedRefs = { branches, tags });
	});

	async extractGitHubRef(repo: string, refAndFilePath: string): Promise<{ ref: string; path: string }> {
		const { branches, tags } = this.cachedRefs || (await this.prepareAllRefs(repo));
		const exactRef = [...branches, ...tags].find(
			(ref) => refAndFilePath === ref.name || refAndFilePath.startsWith(`${ref.name}/`)
		);
		const ref = exactRef ? exactRef.name : refAndFilePath.split('/')[0] || 'HEAD';
		return { ref, path: refAndFilePath.slice(ref.length + 1) };
	}

	async provideBranches(repo: string, options?: CommonQueryOptions): Promise<Branch[]> {
		if (!this.cachedRefs) {
			await this.prepareAllRefs(repo);
		}
		const matchedBranches = options?.query
			? matchSorter(this.cachedRefs?.branches || [], options.query, { keys: ['name'] })
			: this.cachedRefs?.branches || [];
		if (options?.pageSize) {
			const page = options.page || 1;
			const pageSize = options.pageSize;
			return matchedBranches.slice(pageSize * (page - 1), pageSize * page);
		}
		return matchedBranches;
	}

	async provideTags(repo: string, options?: CommonQueryOptions): Promise<Tag[]> {
		if (!this.cachedRefs) {
			await this.prepareAllRefs(repo);
		}
		const matchedTags = options?.query
			? matchSorter(this.cachedRefs?.tags || [], options.query, { keys: ['name'] })
			: this.cachedRefs?.tags || [];
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
		options: TextSearchOptions
	): Promise<TextSearchResults> {
		const repoPattern = this.buildRepoPattern(repo);
		return getTextSearchResults(repoPattern, ref, query, options);
	}

	async provideCommits(repo: string, options?: CommitsQueryOptions): Promise<(Commit & { files?: ChangedFile[] })[]> {
		let commits = await getCommits(
			this.buildRepository(repo),
			options?.from || 'HEAD',
			options?.path,
			options?.pageSize ? options.pageSize * (options.page || 1) : undefined
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
		symbol: string
	): Promise<SymbolDefinitions> {
		const repoPattern = this.buildRepoPattern(repo);
		return getSymbolDefinitions(repoPattern, ref, path, line, character, symbol);
	}

	async provideSymbolReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string
	): Promise<SymbolReferences> {
		const repoPattern = this.buildRepoPattern(repo);
		return getSymbolReferences(repoPattern, ref, path, line, character, symbol);
	}

	async provideSymbolHover(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		_symbol: string
	): Promise<SymbolHover | null> {
		const repoPattern = this.buildRepoPattern(repo);
		return getSymbolHover(repoPattern, ref, path, line, character);
	}

	provideUserAvatarLink(user: string): string {
		return `https://github.com/${user}.png`;
	}
}
