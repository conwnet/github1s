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
import { matchSorter } from 'match-sorter';
import { reuseable } from '@/helpers/func';
import router from '@/router';
import { getGitHubAllFiles } from '@/interfaces/github-api-rest';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';
import { insertGitHubRESTEntryToDirectory } from './fileSystemProvider/util';
import { GitHubRESTEntry } from './fileSystemProvider/types';

export class GitHub1sFileSearchProvider
	implements FileSearchProvider, Disposable {
	static scheme = 'github1s';
	private readonly disposable: Disposable;
	private fileUrisMap: Map<string, Uri[]> = new Map();

	constructor(private fsProvider: GitHub1sFileSystemProvider) {
		// Preload the files for better `ctrl/command + p` experience.
		// Once we have loaded the files, it will also populate the files into
		// fileSystemProvider's cache. So after that, we don't have to send
		// a request when you open the new directory in explorer late
		this.loadFilesForCurrentAuthority();
	}

	dispose() {
		this.disposable?.dispose();
	}

	// load the files for current authority
	async loadFilesForCurrentAuthority() {
		return this.getFileUris(await router.getAuthority());
	}

	/**
	 * Get all files for the repo with specified by `authority`.
	 * The response of corresponding API maybe truncated, if so,
	 * we should not insert the response to the fileSystemProvider's
	 * cache, and the fuzzy search maybe not work fine
	 */
	getFileUris = reuseable(
		async (authority: string): Promise<Uri[]> => {
			if (this.fileUrisMap.has(authority)) {
				return this.fileUrisMap.get(authority);
			}
			const [owner, repo, ref] = authority.split('+');
			const treeData = await getGitHubAllFiles(owner, repo, ref);
			const rootDirectoryUri = Uri.parse('').with({
				scheme: GitHub1sFileSystemProvider.scheme,
				authority,
				path: '/',
			});

			// the number of items in the tree array maybe exceeded maximum limit, only
			// insert the data to fileSystemProvider's cache if `treeData.truncated` is false
			if (!treeData.truncated) {
				const rootDirectory = await this.fsProvider.lookupAsDirectory(
					rootDirectoryUri,
					false
				);
				(treeData.tree || []).forEach((githubEntry: GitHubRESTEntry) => {
					insertGitHubRESTEntryToDirectory(githubEntry, rootDirectory);
				});
			}

			const fileUris = ((treeData.tree || []) as GitHubRESTEntry[])
				.filter((item) => item.type === 'blob')
				.map((item) => Uri.joinPath(rootDirectoryUri, item.path));
			this.fileUrisMap.set(authority, fileUris);
			return fileUris;
		}
	);

	provideFileSearchResults(
		query: FileSearchQuery,
		_options: FileSearchOptions,
		_token: CancellationToken
	): ProviderResult<Uri[]> {
		return router.getAuthority().then(async (authority) => {
			return matchSorter(await this.getFileUris(authority), query.pattern);
		});
	}
}
