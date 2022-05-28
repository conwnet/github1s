/**
 * @file router parser
 * @author netcon
 */

import * as adapterTypes from '../types';
import { parseBitbucketPath } from './parse-path';

export class BitbucketRouterParser extends adapterTypes.RouterParser {
	private static instance: BitbucketRouterParser | null = null;

	public static getInstance(): BitbucketRouterParser {
		if (BitbucketRouterParser.instance) {
			return BitbucketRouterParser.instance;
		}
		return (BitbucketRouterParser.instance = new BitbucketRouterParser());
	}

	parsePath(path: string): Promise<adapterTypes.RouterState> {
		return parseBitbucketPath(path);
	}

	buildTreePath(repo: string, ref?: string, filePath?: string): string {
		return ref ? (filePath ? `/${repo}/src/${ref}/${filePath}` : `/${repo}/src/${ref}`) : `/${repo}`;
	}

	buildBlobPath(repo: string, ref: string, filePath: string, startLine?: number, endLine?: number): string {
		const hash = startLine ? (endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`) : '';
		return `/${repo}/src/${ref}/${filePath}${hash}`;
	}

	buildCommitListPath(repo: string): string {
		return `/${repo}/commits`;
	}

	buildCommitPath(repo: string, commitSha: string): string {
		return `/${repo}/commits/${commitSha}`;
	}

	buildCodeReviewListPath(repo: string): string {
		return `/${repo}/pull-requests`;
	}

	buildCodeReviewPath(repo: string, codeReviewId: string): string {
		return `/${repo}/pull-requests/${codeReviewId}`;
	}

	buildExternalLink(path: string): string {
		return 'https://bitbucket.org' + (path.startsWith('/') ? path : `/${path}`);
	}
}
