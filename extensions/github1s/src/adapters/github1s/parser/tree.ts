/**
 * @file GitHub Tree Url Parser
 * @author netcon
 */

import { PageType, RouterState } from 'github1s';
import { parsePath } from 'history';
import repository from '@/repository';

// try to find corresponding ref from branchNames or tagNames
const findMatchedBranchOrTag = (branchOrTagNames: string[], pathParts: string[]): string => {
	let partIndex = 3;
	let maybeBranch = pathParts[partIndex];

	while (branchOrTagNames.find((item) => item.startsWith(maybeBranch))) {
		if (branchOrTagNames.includes(maybeBranch)) {
			return maybeBranch;
		}
		maybeBranch = `${maybeBranch}/${pathParts[++partIndex]}`;
	}
	return null;
};

const detectRefFormPathParts = async (pathParts: string[]): Promise<string> => {
	if (!pathParts[3] || pathParts[3].toUpperCase() === 'HEAD') {
		return 'HEAD';
	}
	// the ref will be pathParts[3] if there is no other parts after it
	if (!pathParts[4]) {
		return pathParts[3];
	}
	// use Promise.all to fetch all refs in parallel as soon as possible
	const [branchRefs, tagRefs] = await Promise.all([repository.getBranches(), repository.getTags()]);
	const refNames = [...branchRefs, ...tagRefs].map((item) => item.name);
	// fallback to pathParts[3] because it also can be a commit ID
	return findMatchedBranchOrTag(refNames, pathParts) || pathParts[3];
};

export const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname.split('/').filter(Boolean);
	const [owner = 'conwnet', repo = 'github1s'] = pathParts;
	const ref = await detectRefFormPathParts(pathParts);
	const filePath = pathParts.slice(3).join('/').slice(ref.length);

	return { type: PageType.TREE, repo, ref, filePath };
};
