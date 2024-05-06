/**
 * @file router parser for Sourceforge1s
 * @author Your Name
 */

import * as adapterTypes from '../types';
import { parseSourceforgePath } from './parse-path';

export class Sourceforge1sRouterParser extends adapterTypes.RouterParser {
	private static instance: Sourceforge1sRouterParser | null = null;

	public static getInstance(): Sourceforge1sRouterParser {
		if (Sourceforge1sRouterParser.instance) {
			return Sourceforge1sRouterParser.instance;
		}
		return (Sourceforge1sRouterParser.instance = new Sourceforge1sRouterParser());
	}

	parsePath(path: string): Promise<adapterTypes.RouterState> {
		return parseSourceforgePath(path);
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
		return `/${repo}/pull-requests`;
	}

	buildCodeReviewPath(repo: string, codeReviewId: string): string {
		return `/${repo}/pull-request/${codeReviewId}`;
	}

	buildExternalLink(path: string): string {
		return `https://sourceforge.net${path.startsWith('/') ? path : `/${path}`}`;
	}
}
