/**
 * @file router parser
 * @author netcon
 */

import * as github1s from '../types';

export class GitHub1sRouterParser extends github1s.RouterParser {
	private static instance: GitHub1sRouterParser = null;

	public static getInstance(): GitHub1sRouterParser {
		if (GitHub1sRouterParser.instance) {
			return GitHub1sRouterParser.instance;
		}
		return (GitHub1sRouterParser.instance = new GitHub1sRouterParser());
	}

	parsePath(path: string): Promise<github1s.RouterState> {
		return Promise.resolve({ repo: 'conwnet/github1s', ref: 'master', type: github1s.PageType.Tree, filePath: '' });
	}

	buildTreePath(repo: string, ref: string, filePath: string): string {
		return `/${repo}/${ref}/${filePath}`;
	}

	buildBlobPath(repo: string, ref: string, filePath: string, startLine?: number, endLine?: number): string {
		const hash = startLine ? (endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`) : '';
		return `/${repo}/${ref}/${filePath}${hash}`;
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
		return `https://github.com${path}`;
	}
}
