/**
 * @file Branch/Tag Manager
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
import { Branch, Tag } from '@/adapters/types';
import { adapterManager } from '@/adapters';

export class BranchTagManager {
	private static instancesMap = new Map<string, BranchTagManager>();

	private _branchMap = new Map<string, Branch>(); // branchName -> Branch
	private _branchList: Branch[] | null = null;
	private _branchPageSize = 1000;
	private _branchCurrentPage = 1; // page number is begin from 1
	private _branchHasMore = true;

	private _tagMap = new Map<string, Tag>(); // tagName -> Tag
	private _tagList: Tag[] | null = null;
	private _tagPageSize = 1000;
	private _tagCurrentPage = 1; // page number is begin from 1
	private _tagHasMore = true;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!BranchTagManager.instancesMap.has(mapKey)) {
			BranchTagManager.instancesMap.set(mapKey, new BranchTagManager(scheme, repo));
		}
		return BranchTagManager.instancesMap.get(mapKey)!;
	}

	private constructor(
		private _scheme: string,
		private _repo: string,
	) {}

	getBranchList = reuseable(async (forceUpdate: boolean = false): Promise<Branch[]> => {
		if (forceUpdate || !this._branchList) {
			this._branchList = [];
			this._branchCurrentPage = 1;
			await this.loadMoreBranches();
		}
		return this._branchList;
	});

	getBranchItem = reuseable(async (branchName: string, forceUpdate = false): Promise<Branch | null> => {
		if (forceUpdate || !this._branchMap.has(branchName)) {
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const branch = await dataSource.provideBranch(this._repo, branchName);
			branch && this._branchMap.set(branchName, branch);
		}
		return this._branchMap.get(branchName) || null;
	});

	loadMoreBranches = reuseable(async (): Promise<Branch[]> => {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const queryOptions = { pageSize: this._branchPageSize, page: this._branchCurrentPage };
		const branches = await dataSource.provideBranches(this._repo, queryOptions);

		branches.forEach((branch) => this._branchMap.set(branch.name, branch));
		this._branchCurrentPage += 1;
		this._branchHasMore = branches.length === this._branchPageSize;
		(this._branchList || (this._branchList = [])).push(...branches);

		return branches;
	});

	hasMoreBranches = reuseable(async () => {
		return this._branchHasMore;
	});

	getTagList = reuseable(async (forceUpdate: boolean = false): Promise<Tag[]> => {
		if (forceUpdate || !this._tagList) {
			this._tagList = [];
			this._tagCurrentPage = 1;
			await this.loadMoreTags();
		}
		return this._tagList;
	});

	getTagItem = reuseable(async (tagName: string, forceUpdate = false): Promise<Tag | null> => {
		if (forceUpdate || !this._tagMap.has(tagName)) {
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const tag = await dataSource.provideTag(this._repo, tagName);
			tag && this._tagMap.set(tagName, tag);
		}
		return this._tagMap.get(tagName) || null;
	});

	loadMoreTags = reuseable(async (): Promise<Tag[]> => {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const queryOptions = { pageSize: this._tagPageSize, page: this._tagCurrentPage };
		const tags = await dataSource.provideTags(this._repo, queryOptions);

		tags.forEach((tag) => this._tagMap.set(tag.name, tag));
		this._tagCurrentPage += 1;
		this._tagHasMore = tags.length === this._tagPageSize;
		(this._tagList || (this._tagList = [])).push(...tags);

		return tags;
	});

	hasMoreTags = reuseable(async () => {
		return this._tagHasMore;
	});
}
