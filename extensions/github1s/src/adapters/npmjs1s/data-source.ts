/**
 * @file npm data-source-provider
 * @author netcon
 */

import { CommonQueryOptions, DataSource, Directory, DirectoryEntry, File, FileType, Tag } from '../types';
import { matchSorter } from 'match-sorter';
import * as dayjs from 'dayjs';

type PackageFile = {
	path: string;
	size: number;
	type: 'file';
};

type PackageDirectory = {
	files: PackageEntry[];
	type: 'directory';
	path: string;
};

type PackageEntry = PackageFile | PackageDirectory;

type PackageVersion = { name: string; tag?: string; time?: Date };

const retrieveFiles = (files: PackageEntry[], pathDeep: number, recursive: boolean) => {
	const entries: DirectoryEntry[] = [];
	for (const item of files) {
		const fileType = item.type === 'directory' ? FileType.Directory : FileType.File;
		const filePath = item.path.split(/\/+/).filter(Boolean).slice(pathDeep).join('/');
		entries.push({ type: fileType, path: filePath });
		if (recursive && item.type === 'directory' && item.files?.length) {
			entries.push(...retrieveFiles(item.files, pathDeep, recursive));
		}
	}
	return entries;
};

export class Npmjs1sDataSource extends DataSource {
	private static instance: Npmjs1sDataSource | null = null;
	private _filesPromiseMap: Map<string, Promise<PackageEntry[]>> = new Map();
	private _versionsPromiseMap: Map<string, Promise<PackageVersion[]>> = new Map();

	public static getInstance(): Npmjs1sDataSource {
		if (Npmjs1sDataSource.instance) {
			return Npmjs1sDataSource.instance;
		}
		return (Npmjs1sDataSource.instance = new Npmjs1sDataSource());
	}

	getPackageFiles(packageName: string, version: string): Promise<PackageEntry[]> {
		const mapKey = `${packageName} ${version}`;
		if (!this._filesPromiseMap.has(mapKey)) {
			const requestUrl = `https://unpkg.com/${packageName}@${version}/?meta`;
			const filesPromise = fetch(requestUrl)
				.then((response) => response.json())
				.then((data) => data?.files || []);
			this._filesPromiseMap.set(mapKey, filesPromise);
		}
		return this._filesPromiseMap.get(mapKey)!;
	}

	async provideDirectory(packageName: string, version: string, path: string, recursive = false): Promise<Directory> {
		const pathParts = path.split(/\/+/).filter(Boolean);
		const parentFiles = pathParts.reduce(
			(prevFiles, _, index) => {
				const currentPath = `/${pathParts.slice(0, index + 1).join('/')}`;
				const fileNode = prevFiles?.find((item) => item.path === currentPath);
				return fileNode?.type === 'directory' ? fileNode.files : null;
			},
			await this.getPackageFiles(packageName, version),
		);
		const entries = parentFiles ? retrieveFiles(parentFiles, pathParts.length, recursive) : [];
		return { entries, truncated: false };
	}

	async provideFile(packageName: string, version: string, path: string): Promise<File> {
		const response = await fetch(`https://unpkg.com/${packageName}@${version}/${path}`);
		return { content: new Uint8Array(await response.arrayBuffer()) };
	}

	getPackageVersions(packageName: string): Promise<PackageVersion[]> {
		if (!this._versionsPromiseMap.has(packageName)) {
			const versionsPromise = new Promise<PackageVersion[]>(async (resolve, reject) => {
				const requestUrl = `https://registry.npmjs.org/${packageName}`;
				const data = await fetch(requestUrl).then((response) => response.json(), reject);
				const tagEntries = Object.entries(data?.['dist-tags'] || {}) as [string, string][];
				const versionTag = tagEntries.reduce((prevVersionTag, [tag, version]) => {
					prevVersionTag[version] = tag;
					return prevVersionTag;
				}, {}) as Record<string, string>;
				const packageVersions = Object.keys(data?.versions || {}).map((version) => {
					const releaseTime = data?.time?.[version] ? new Date(data.time[version]) : undefined;
					return { name: version, tag: versionTag[version], time: releaseTime };
				});
				const sortByTimeDesc = (versionA, versionB) => {
					if (+!versionA.tag ^ +!versionB.tag) {
						return versionA.tag ? -1 : 1;
					}
					return versionB.time?.getTime() - versionA.time?.getTime();
				};
				return resolve(packageVersions.sort(sortByTimeDesc));
			});
			this._versionsPromiseMap.set(packageName, versionsPromise);
		}
		return this._versionsPromiseMap.get(packageName)!;
	}

	transformVersionToTag(version: PackageVersion) {
		const tagPart = version.tag ? `${version.tag}, ` : '';
		const timePart = version.time ? `published at ${dayjs(version.time).format('YYYY-MM-DD HH:mm:ss')}` : '';
		return { name: version.name, description: `${tagPart}${timePart}` };
	}

	async provideTags(packageName: string, options?: CommonQueryOptions): Promise<Tag[]> {
		const versions = await this.getPackageVersions(packageName);
		const allTags = versions.map((version) => this.transformVersionToTag(version));
		const matchedTags = options?.query ? matchSorter(allTags, options.query, { keys: ['name'] }) : allTags;
		if (options?.pageSize) {
			const page = options.page || 1;
			const pageSize = options.pageSize;
			return matchedTags.slice(pageSize * (page - 1), pageSize * page);
		}
		return matchedTags;
	}

	async provideTag(packageName: string, tagName: string): Promise<Tag | null> {
		const versions = await this.getPackageVersions(packageName);
		const matchedVersion = versions.find((tag) => tag.name === tagName);
		return matchedVersion ? this.transformVersionToTag(matchedVersion) : null;
	}

	provideUserAvatarLink(user: string): string {
		return `https://www.gravatar.com/avatar/${user}?d=identicon`;
	}
}
