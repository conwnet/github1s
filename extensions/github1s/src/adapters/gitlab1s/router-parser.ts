/**
 * @file router parser
 * @author netcon
 */

import { joinPath } from '@/helpers/util';
import * as adapterTypes from '../types';
import { parseGitLabPath } from './parse-path';

export class GitLab1sRouterParser extends adapterTypes.RouterParser {
	private static instance: GitLab1sRouterParser | null = null;

	public static getInstance(): GitLab1sRouterParser {
		if (GitLab1sRouterParser.instance) {
			return GitLab1sRouterParser.instance;
		}
		return (GitLab1sRouterParser.instance = new GitLab1sRouterParser());
	}

	parsePath(path: string): Promise<adapterTypes.RouterState> {
		return parseGitLabPath(path);
	}

	buildTreePath(repo: string, ref?: string, filePath?: string): string {
		return ref ? (filePath ? `/${repo}/-/tree/${ref}/${filePath}` : `/${repo}/-/tree/${ref}`) : `/${repo}`;
	}

	buildBlobPath(repo: string, ref: string, filePath: string, startLine?: number, endLine?: number): string {
		const hash = startLine ? (endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`) : '';
		return `/${repo}/-/blob/${ref}/${filePath}${hash}`;
	}

	buildCommitListPath(repo: string): string {
		return `/${repo}/-/commits`;
	}

	buildCommitPath(repo: string, commitSha: string): string {
		return `/${repo}/-/commit/${commitSha}`;
	}

	buildCodeReviewListPath(repo: string): string {
		return `/${repo}/-/merge_requests`;
	}

	buildCodeReviewPath(repo: string, codeReviewId: string): string {
		return `/${repo}/-/merge_requests/${codeReviewId}`;
	}

	buildExternalLink(path: string): string {
		return joinPath(GITLAB_ORIGIN, path);
	}
}
