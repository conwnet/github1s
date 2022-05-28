/**
 * @file router parser
 * @author netcon
 */

import { parsePath } from 'history';
import { PageType, RouterParser, RouterState } from '../types';

export const parseNpmPath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname?.split('/').filter(Boolean) || [];

	if (!pathParts.length) {
		return { pageType: PageType.Tree, repo: 'lodash', ref: 'latest', filePath: '' };
	}

	const trimedParts = pathParts[0] === 'package' ? pathParts.slice(1) : pathParts;
	const packagePartsLength = trimedParts[0] && trimedParts[0][0] === '@' ? 2 : 1;
	const packageParts = trimedParts.slice(0, packagePartsLength);
	const packageName = packageParts.join('/') || 'package';
	const packageVersion =
		trimedParts[packagePartsLength] === 'v' ? trimedParts[packagePartsLength + 1] || 'latest' : 'latest';

	return { pageType: PageType.Tree as const, repo: packageName, ref: packageVersion, filePath: '' };
};

export class Npmjs1sRouterParser extends RouterParser {
	private static instance: Npmjs1sRouterParser | null = null;

	public static getInstance(): Npmjs1sRouterParser {
		if (Npmjs1sRouterParser.instance) {
			return Npmjs1sRouterParser.instance;
		}
		return (Npmjs1sRouterParser.instance = new Npmjs1sRouterParser());
	}

	parsePath(path: string): Promise<RouterState> {
		return parseNpmPath(path);
	}

	buildTreePath(packageName: string, version: string): string {
		return `/package/${packageName}${version === 'latest' ? '' : `/v/${version}`}`;
	}

	buildBlobPath(packageName: string, version: string): string {
		return `/package/${packageName}${version === 'latest' ? '' : `/v/${version}`}`;
	}

	buildCommitListPath(packageName: string): string {
		return `/package/${packageName}`;
	}

	buildCommitPath(packageName: string): string {
		return `/package/${packageName}`;
	}

	buildCodeReviewListPath(packageName: string): string {
		return `/package/${packageName}`;
	}

	buildCodeReviewPath(packageName: string): string {
		return `/package/${packageName}`;
	}

	buildExternalLink(path: string): string {
		return 'https://npmjs.com' + (path.startsWith('/') ? path : `/${path}`);
	}
}
