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
	window,
} from 'vscode';
import { getAdapter } from '@/adapters';
import { matchSorter } from 'match-sorter';
import { reuseable } from '@/helpers/func';
import router from '@/router';
import * as adapterTypes from '@/adapters/types';
import { GitHub1sFileSystemProvider } from './file-system';

export class GitHub1sFileSearchProvider implements FileSearchProvider, Disposable {
	private static instance: GitHub1sFileSearchProvider | null = null;
	private readonly disposable: Disposable;
	private filePathsMap: Map<string, string[]> = new Map();

	private constructor() {
		// Preload the files for better `ctrl/command + p` experience.
		// Once we have loaded the files, it will also populate the files into
		// fileSystemProvider's cache. So after that, we don't have to send
		// a request when you open the new directory in explorer late
		this.loadFilesForCurrentWorkspace();
	}

	public static getInstance(): GitHub1sFileSearchProvider {
		if (GitHub1sFileSearchProvider.instance) {
			return GitHub1sFileSearchProvider.instance;
		}
		return (GitHub1sFileSearchProvider.instance = new GitHub1sFileSearchProvider());
	}

	dispose() {
		this.disposable?.dispose();
	}

	// load the files for current workspace
	async loadFilesForCurrentWorkspace() {
		return this.getFileUris(router.buildUri({ path: '/' }));
	}

	/**
	 * Get all files for the repo with specified rootUri.
	 * The response of corresponding API maybe truncated, if so,
	 * we should not insert the response to the fileSystemProvider's
	 * cache, and the fuzzy search maybe not work fine
	 */
	getFileUris = reuseable(
		async (rootUri: Uri): Promise<Uri[]> => {
			const { scheme, repo, ref } = router.parseUri(rootUri);
			const cacheKey = `${scheme}:${repo}@${ref}`;

			if (this.filePathsMap.has(cacheKey)) {
				return this.filePathsMap.get(cacheKey)!.map((path) => {
					return rootUri.with({ path });
				});
			}

			rootUri = rootUri.with({ path: '/' }); // ensure the rootPath
			const dataSource = await getAdapter(scheme).resolveDataSource();
			const rootDirectoryData = await dataSource.provideDirectory(repo, ref, '/', true);

			// the number of items in the tree array maybe exceeded maximum limit, only
			// insert the data to fileSystemProvider's cache if `treeData.truncated` is false
			if (!rootDirectoryData?.truncated) {
				const fsProvider = GitHub1sFileSystemProvider.getInstance();
				fsProvider.populateWithDirectoryEntities(rootUri, rootDirectoryData?.entries || []);
			} else {
				window.showWarningMessage('Too many files in this repository, file search feature may be limited.');
			}

			const filePaths = (rootDirectoryData?.entries || [])
				.filter((item) => item.type === adapterTypes.FileType.File)
				.map((item) => item.path);
			this.filePathsMap.set(cacheKey, filePaths);
			return filePaths.map((path) => rootUri.with({ path }));
		},
		(rootUri) => rootUri.toString(),
	);

	provideFileSearchResults(
		query: FileSearchQuery,
		options: FileSearchOptions,
		_token: CancellationToken,
	): ProviderResult<Uri[]> {
		return new Promise(async (resolve) => {
			const folderPath = options.folder.path.replace(/\/+$/, '');
			const rootUri = options.folder.with({ path: '/' });
			const fileUris = (await this.getFileUris(rootUri)).filter((uri) => uri.path.startsWith(`${folderPath}/`));
			resolve(matchSorter(fileUris, query.pattern));
		});
	}
}
