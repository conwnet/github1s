/**
 * @file router parser
 * @author netcon
 * @updated by kcoms555 for Enterprise
 */

import * as adapterTypes from '../types';
import { parseGitHubEnterprisePath } from './parse-path';
import { ConfigsForEnterprise } from '../../../../../platform_config';

export class GitHubEnterprise1sRouterParser extends adapterTypes.RouterParser {
	protected static instance: GitHubEnterprise1sRouterParser | null = null;

	public static getInstance(): GitHubEnterprise1sRouterParser {
		if (GitHubEnterprise1sRouterParser.instance) {
			return GitHubEnterprise1sRouterParser.instance;
		}
		return (GitHubEnterprise1sRouterParser.instance = new GitHubEnterprise1sRouterParser());
	}

	parsePath(path: string): Promise<adapterTypes.RouterState> {
		return parseGitHubEnterprisePath(path);
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

	buildCodeReviewPath(repo: string, codeReviewId: string): string {
		return `/${repo}/pull/${codeReviewId}`;
	}

	buildExternalLink(path: string): string {
		return ConfigsForEnterprise.github_enterprise_baseUrl + (path.startsWith('/') ? path : `/${path}`);
	}
}
