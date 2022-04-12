/**
 * @file router parser
 * @author netcon
 */

import * as github1s from '../types';
import { parseGitHubPath } from './parser';

export class GitHub1sRouterParser extends github1s.RouterParser {
	private static instance: GitHub1sRouterParser | null = null;

	public static getInstance(): GitHub1sRouterParser {
		if (GitHub1sRouterParser.instance) {
			return GitHub1sRouterParser.instance;
		}
		return (GitHub1sRouterParser.instance = new GitHub1sRouterParser());
	}

	parsePath(path: string): Promise<github1s.RouterState> {
		return parseGitHubPath(path);
	}

	buildTreePath(repo: string, ref?: string, filePath?: string): string {
		return ref ? (filePath ? `/${repo}/tree/${ref}/${filePath}` : `/${repo}/tree/${ref}`) : `/${repo}`;
	}

	buildBlobPath(repo: string, ref: string, filePath: string, startLine?: number, endLine?: number): string {
		const hash = startLine ? (endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`) : '';
		return `/${repo}/blob/${ref}/${filePath}${hash}`;
	}

	buildCommitListPath(repo: string): string {
		return `/${repo}/commits`;
	}

	buildCommitPath(repo: string, commitSha: string): string {
		return `/${repo}/commit/${commitSha}`;
	}

	buildCodeReviewListPath(repo: string): string {
		return `/${repo}/pulls`;
	}

	buildCodeReviewPath(repo: string, codeReviewId: string): github1s.Promisable<string> {
		return `/${repo}/pull/${codeReviewId}`;
	}

	buildExternalLink(path: string): string {
		return 'https://github.com' + (path.startsWith('/') ? path : `/${path}`);
	}
}
