/**
 * @file trending page data source
 * @author netcon
 */

import { joinPath } from '@/helpers/util';
import { getCollections } from './interfaces';
import { RankingLanguages, RankingPeriod } from './constants';
import { DataSource, Directory, File, FileType, Promisable } from '../types';
import {
	createCollectionPageMarkdown,
	createCollectionsListPageMarkdown,
	createLanguageListPageMarkdown,
	createRankingPageMarkdown,
} from './templates';

type StructureItem =
	| {
			type: FileType.Directory;
			name: string;
			children: StructureItem[] | (() => Promisable<StructureItem[]>);
	  }
	| {
			type: FileType.File;
			name: string;
			content?: string | (() => Promisable<string>);
	  };

export class OSSInsightDataSource extends DataSource {
	private static instance: OSSInsightDataSource | null = null;
	private textEncodder = new TextEncoder();
	private rootStructure: StructureItem = {
		type: FileType.Directory,
		name: '',
		children: [
			{
				type: FileType.Directory,
				name: 'collections',
				children: () =>
					getCollections().then((collections) => {
						const collectionsSet = new Set(collections.map((collection) => collection.name));
						return Array.from(collectionsSet).map((collection) => ({
							type: FileType.File,
							name: `${collection}.md`,
							content: () => createCollectionPageMarkdown(collection),
						}));
					}),
			},
			{
				type: FileType.Directory,
				name: 'languages',
				children: () =>
					RankingLanguages.map((language) => {
						return {
							type: FileType.Directory,
							name: language,
							children: [
								{
									type: FileType.File,
									name: `${language}_Today.md`,
									content: () => createRankingPageMarkdown(RankingPeriod.Today, language),
								},
								{
									type: FileType.File,
									name: `${language}_ThisWeek.md`,
									content: () => createRankingPageMarkdown(RankingPeriod.ThisWeek, language),
								},
								{
									type: FileType.File,
									name: `${language}_ThisMonth.md`,
									content: () => createRankingPageMarkdown(RankingPeriod.ThisMonth, language),
								},
							],
						};
					}),
			},
			{
				type: FileType.File,
				name: 'Collections.md',
				content: () => createCollectionsListPageMarkdown(),
			},
			{
				type: FileType.File,
				name: 'Languages.md',
				content: () => createLanguageListPageMarkdown(),
			},
			{
				type: FileType.File,
				name: 'README.md',
				content: () => createRankingPageMarkdown(RankingPeriod.Today),
			},
			{
				type: FileType.File,
				name: 'ThisMonth.md',
				content: () => createRankingPageMarkdown(RankingPeriod.ThisMonth),
			},
			{
				type: FileType.File,
				name: 'ThisWeek.md',
				content: () => createRankingPageMarkdown(RankingPeriod.ThisWeek),
			},
		],
	};

	public static getInstance(): OSSInsightDataSource {
		if (OSSInsightDataSource.instance) {
			return OSSInsightDataSource.instance;
		}
		return (OSSInsightDataSource.instance = new OSSInsightDataSource());
	}

	async getStructureItemChildren(item?: StructureItem) {
		if (item?.type !== FileType.Directory) {
			throw new Error('Not a directory');
		}
		if (typeof item.children === 'function') {
			item.children = await item.children();
		}
		return item.children;
	}

	async resolveStructureItem(path: string) {
		let structureItem: StructureItem | undefined = this.rootStructure;
		for (const pathPart of path.split('/').filter(Boolean)) {
			const children = await this.getStructureItemChildren(structureItem);
			structureItem = children.find((child) => child.name === pathPart);
		}
		return structureItem;
	}

	async provideDirectory(repo: string, ref: string, path: string, recursive?: boolean): Promise<Directory> {
		const walk = async (item: StructureItem | undefined, recursive = false, basePath = '') => {
			const directoryEntires: Directory['entries'] = [];
			for (const child of await this.getStructureItemChildren(item)) {
				const currentPath = joinPath(basePath, child.name);
				directoryEntires.push({ type: child.type, path: currentPath });
				if (recursive && child.type === FileType.Directory) {
					directoryEntires.push(...(await walk(child, recursive, currentPath)));
				}
			}
			return directoryEntires;
		};

		return {
			truncated: false,
			entries: await walk(await this.resolveStructureItem(path), recursive),
		};
	}

	async provideFile(repo: string, ref: string, path: string): Promise<File> {
		const structureItem = await this.resolveStructureItem(path);
		if (structureItem?.type !== FileType.File) {
			throw new Error('Not a file');
		}
		if (typeof structureItem.content === 'function') {
			structureItem.content = await structureItem.content();
		}
		return {
			content: this.textEncodder.encode(structureItem.content) || '',
		};
	}
}
