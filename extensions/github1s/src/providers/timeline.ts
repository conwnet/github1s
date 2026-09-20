/**
 * @file File history timeline
 */

import * as vscode from 'vscode';
import router, { UriState } from '@/router';
import { Repository } from '@/repository';
import { getCommitTooltip } from '@/helpers/commit';
import { Commit } from '@/adapters/types';
import { supportsCommitFeatures } from '@/adapters';

export class FileHistoryTimelineProvider implements vscode.TimelineProvider, vscode.Disposable {
	private static instance: FileHistoryTimelineProvider | null = null;
	readonly id = 'github1s.fileHistory';
	readonly label = 'Git History';

	private readonly changed = new vscode.EventEmitter<vscode.TimelineChangeEvent | undefined>();
	readonly onDidChange = this.changed.event;
	// Incremented on refresh so requests started earlier cannot publish stale results.
	private refreshVersion = 0;

	private constructor() {}

	public static getInstance(): FileHistoryTimelineProvider {
		if (!FileHistoryTimelineProvider.instance) {
			FileHistoryTimelineProvider.instance = new FileHistoryTimelineProvider();
		}
		return FileHistoryTimelineProvider.instance;
	}

	refresh() {
		this.refreshVersion++;
		this.changed.fire(undefined);
	}

	dispose() {
		this.refreshVersion++;
		this.changed.dispose();
	}

	async provideTimeline(
		uri: vscode.Uri,
		options: vscode.TimelineOptions,
		token: vscode.CancellationToken,
	): Promise<vscode.Timeline | undefined> {
		if (uri.path === '/' || token.isCancellationRequested || !(await supportsCommitFeatures(uri.scheme))) {
			return undefined;
		}

		const { scheme, repo, ref: fileRef, path } = router.parseUri(uri);
		if (!repo) {
			return undefined;
		}
		const state = router.getState();
		// Keep historical editors anchored to the workspace ref.
		const ref = repo === state.repo ? state.ref : fileRef;
		const version = this.refreshVersion;
		const page = await this.getCommitPage({ scheme, repo, ref, path }, options, token);
		if (!page || token.isCancellationRequested || version !== this.refreshVersion) {
			return undefined;
		}

		const fileUri = router.buildUri({ repo, ref }, uri).with({ query: '', fragment: '' });
		return {
			items: page.commits.map((commit) => this.toTimelineItem(commit, fileUri)),
			paging: { cursor: page.cursor },
		};
	}

	private async getCommitPage(
		{ scheme, repo, ref, path }: UriState,
		{ cursor, limit }: vscode.TimelineOptions,
		token: vscode.CancellationToken,
	): Promise<{ commits: Commit[]; cursor?: string } | undefined> {
		const repository = Repository.getInstance(scheme, repo);
		const version = this.refreshVersion;
		let commits = await repository.getCommitList(ref, path);
		if (token.isCancellationRequested || version !== this.refreshVersion) {
			return undefined;
		}

		// Reuse cached history and load at most one more page when its last commit is reached.
		if (cursor && cursor === commits[commits.length - 1]?.sha) {
			await repository.loadMoreCommits(ref, path);
			commits = await repository.getCommitList(ref, path);
		}

		const cursorIndex = cursor ? commits.findIndex((commit) => commit.sha === cursor) : -1;
		if (cursor && cursorIndex === -1) {
			return { commits: [] };
		}
		let page = commits.slice(cursorIndex + 1);
		if (typeof limit === 'number') {
			page = page.slice(0, Math.max(0, limit));
		} else if (limit) {
			// Include the ID boundary; exclude commits older than the timestamp boundary.
			const boundaryIndex = page.findIndex((commit) =>
				limit.id ? commit.sha === limit.id : (commit.createTime?.getTime() ?? 0) < limit.timestamp,
			);
			if (boundaryIndex !== -1) {
				page = page.slice(0, boundaryIndex + (limit.id ? 1 : 0));
			}
		}

		const lastCommit = page[page.length - 1];
		const hasMore =
			lastCommit !== undefined &&
			(lastCommit.sha !== commits[commits.length - 1]?.sha || (await repository.hasMoreCommits(ref, path)));
		return { commits: page, cursor: hasMore ? lastCommit.sha : undefined };
	}

	private toTimelineItem(commit: Commit, uri: vscode.Uri): vscode.TimelineItem {
		return {
			id: commit.sha,
			label: commit.message.split(/[\r\n]/)[0],
			timestamp: commit.createTime?.getTime() ?? 0,
			description: [commit.sha.slice(0, 7), commit.author].filter(Boolean).join(', '),
			tooltip: getCommitTooltip(commit),
			iconPath: commit.avatarUrl ? vscode.Uri.parse(commit.avatarUrl) : new vscode.ThemeIcon('git-commit'),
			contextValue: 'github1s:timeline:commit',
			command: {
				title: 'Open Changes',
				command: 'github1s.commands.diffCommitFile',
				arguments: [router.buildUri({ ref: commit.sha }, uri)],
			},
		};
	}
}
