/**
 * @file GitHub1s FileSearchProvider (ctrl/cmd + p)
 * @author netcon
 */

import {
	CancellationToken,
	Disposable,
	FileSearchProvider,
	FileSearchQuery,
	FileSearchOptions,
	ProviderResult,
	Uri,
} from 'vscode';
import Fuse from 'fuse.js';
import { reuseable } from '@/helpers/func';
import router from '@/router';
import { getGithubAllFiles } from '@/interfaces/github-api-rest';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';
import { insertGitHubRESTEntryToDirectory } from './fileSystemProvider/util';
import { GithubRESTEntry } from './fileSystemProvider/types';

export class GitHub1sFileSearchProvider
	implements FileSearchProvider, Disposable {
	static scheme = 'github1s';
	private readonly disposable: Disposable;
	private fuseMap: Map<string, Fuse<GithubRESTEntry>> = new Map();

	constructor(private fsProvider: GitHub1sFileSystemProvider) {}

	dispose() {
		this.disposable?.dispose();
	}

	/**
	 * getFuse for fuzzy file search,
	 * it maybe take longer time, so we just run it in backend
	 * if this is failed, the fuzzy search maybe not work fine
	 */
	getFuse = reuseable(
		async (authority: string): Promise<Fuse<GithubRESTEntry>> => {
			if (this.fuseMap.has(authority)) {
				return this.fuseMap.get(authority);
			}
			const [owner, repo, ref] = authority.split('+');

			return getGithubAllFiles(owner, repo, ref).then(async (treeData) => {
				if (!treeData.truncated) {
					// the number of items in the tree array maybe exceeded maximum limit
					// only update the rootDirectory if `treeData.truncated` is false
					const rootDirectory = await this.fsProvider.lookupAsDirectory(
						Uri.parse('').with({
							scheme: GitHub1sFileSystemProvider.scheme,
							authority,
							path: '/',
						}),
						false
					);
					(treeData.tree || []).forEach((githubEntry: GithubRESTEntry) => {
						insertGitHubRESTEntryToDirectory(githubEntry, rootDirectory);
					});
				}
				const fuse = new Fuse(
					((treeData.tree || []) as GithubRESTEntry[]).filter(
						(item) => item.type === 'blob'
					),
					{ keys: ['path'] }
				);
				this.fuseMap.set(authority, fuse);
				return fuse;
			});
		}
	);

	provideFileSearchResults(
		query: FileSearchQuery,
		_options: FileSearchOptions,
		_token: CancellationToken
	): ProviderResult<Uri[]> {
		return router.getAuthority().then(async (authority) => {
			const fuse = await this.getFuse(authority);
			return fuse.search(query.pattern).map((result) => {
				return Uri.parse('').with({
					authority,
					scheme: GitHub1sFileSystemProvider.scheme,
					path: `/${result.item.path}`,
				});
			});
		});
	}
}
