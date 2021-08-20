/**
 * @file github1s data-source-provider
 * @author fezhang
 */

import {
	Branch,
	CodeLocation,
	CodeReview,
	CodeReviewStatus,
	CodeSearchOptions,
	Commit,
	CommonQueryOptions,
	DataSourceProvider,
	Directory,
	DirectoryEntity,
	File,
	FileBlameRange,
	FileType,
	Promisable,
	Tag,
} from '../types';
(self as any).global = self;
import { Octokit } from '@octokit/core';

const parseRepoFullName = (repoFullName: string) => {
	const [owner, repo] = repoFullName.split('/');
	return { owner, repo };
};

const encodeFilePath = (filePath: string): string => {
	return filePath
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');
};

export class GitHub1sDataSourceProvider implements DataSourceProvider {
	private octokit = new Octokit();

	async provideDirectory(repoFullName: string, ref: string, path: string, recursive: boolean): Promise<Directory> {
		const requestParams = { ref, recursive, path: encodeFilePath(path), ...parseRepoFullName(repoFullName) };
		const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/git/trees/{ref}:{path}', requestParams);
		const parseTreeItem = (treeItem): DirectoryEntity => ({
			path: treeItem.path,
			type: treeItem.type === 'blob' ? FileType.File : FileType.Directory,
			size: treeItem.size,
		});

		return {
			entities: (data.tree || []).map(parseTreeItem),
			truncated: !!data.truncated,
		};
	}

	provideFile(repoFullName: string, ref: string, path: string): Promisable<File> {
		const { owner, repo } = parseRepoFullName(repoFullName);
		return fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${encodeFilePath(path)}`)
			.then((response) => response.arrayBuffer())
			.then((buffer) => ({ content: buffer }));
	}

	provideBranches(repo: string, options: CommonQueryOptions): Promisable<Branch[]> {
		throw new Error('Method not implemented.');
	}

	provideBranch(repo: string, branch: string): Promisable<Branch> {
		throw new Error('Method not implemented.');
	}

	provideTags(repo: string, options: CommonQueryOptions): Promisable<Tag[]> {
		throw new Error('Method not implemented.');
	}

	provideTag(repo: string, tag: string): Promisable<Tag> {
		throw new Error('Method not implemented.');
	}

	provideCommits(
		repo: string,
		options: CommonQueryOptions & {
			from?: string;
			author?: string;
			path?: string;
		}
	): Promisable<Commit[]> {
		throw new Error('Method not implemented.');
	}

	provideCommit(repo: string, ref: string): Promisable<Commit> {
		throw new Error('Method not implemented.');
	}

	provideTextSearchResults(
		repo: string,
		ref: string,
		query: string,
		options: CodeSearchOptions,
		report: (results: CodeLocation[]) => void
	): Promisable<{ limitHit: boolean }> {
		throw new Error('Method not implemented.');
	}

	provideCodeReviews(
		repo: string,
		options: CommonQueryOptions & { state?: CodeReviewStatus; creator?: string }
	): Promisable<CodeReview[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeReview(repo: string, id: string): Promisable<CodeReview> {
		throw new Error('Method not implemented.');
	}

	provideFileBlameRanges(repo: string, ref: string, path: string): Promisable<FileBlameRange[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeDefinition(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): Promisable<CodeLocation | CodeLocation[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number
	): Promisable<CodeLocation[]> {
		throw new Error('Method not implemented.');
	}

	provideCodeHover(repo: string, ref: string, path: string, line: number, character: number): Promisable<string> {
		throw new Error('Method not implemented.');
	}

	provideUserAvatarLink(user: string): Promisable<string> {
		throw new Error('Method not implemented.');
	}
}
