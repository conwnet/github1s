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
import * as adapterTypes from '@/adapters/types';
import { GitHub1sFileSystemProvider } from './fileSystemProvider';
import adapterManager from '@/adapters/manager';

export class GitHub1sFileSearchProvider implements FileSearchProvider, Disposable {
	private static instance: GitHub1sFileSearchProvider = null;
	private readonly disposable: Disposable;
	private fileUrisMap: Map<string, Uri[]> = new Map();

	private constructor() {}

	public static getInstance(): GitHub1sFileSearchProvider {
		if (GitHub1sFileSearchProvider.instance) {
			return GitHub1sFileSearchProvider.instance;
		}
		return (GitHub1sFileSearchProvider.instance = new GitHub1sFileSearchProvider());
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

			const [repo, ref] = authority.split('+');
			const currentAdapter = adapterManager.getCurrentAdapter();
			const dataSource = await currentAdapter.resolveDataSource();
			const rootDirectoryData = await dataSource.provideDirectory(repo, ref, '', true);
			const rootDirectoryUri = Uri.parse('').with({ scheme: currentAdapter.scheme, authority, path: '/' });

			// the number of items in the tree array maybe exceeded maximum limit, only
			// insert the data to fileSystemProvider's cache if `treeData.truncated` is false
			if (!rootDirectoryData.truncated) {
				const fsProvider = GitHub1sFileSystemProvider.getInstance();
				fsProvider.populateWithDirectoryEntities(rootDirectoryUri, rootDirectoryData.entries);
			}

			const fileUris = (rootDirectoryData.entries || [])
				.filter((item) => item.type === adapterTypes.FileType.File)
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
