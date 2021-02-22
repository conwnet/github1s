/**
 * @file github ref(branch or tag) utils
 * @author netcon
 */

import * as vscode from 'vscode';
import { reuseable } from './func';
import { getGithubBranchRefs, getGithubTagRefs } from '../api';

export interface RepositoryRef {
	name: string;
	ref: string;
	node_id: string;
	url: string;
	object: {
		sha: string;
		type: string;
		url: string;
	};
}

let currentOwner = '';
let currentRepo = '';
let currentRef = '';
let repositoryBranchRefs: RepositoryRef[] = null;
let repositoryTagRefs: RepositoryRef[] = null;

// get current browser uri, update `currentOwner` and `currentRepo`
const getBrowserUri = (): Promise<vscode.Uri> => {
	return (vscode.commands.executeCommand(
		'github1s.vscode.get-browser-url'
	) as Promise<string>).then((browserUrl) => {
		const browserUri = vscode.Uri.parse(browserUrl);
		const [owner = 'conwnet', repo = 'github1s'] = browserUri.path
			.split('/')
			.filter(Boolean);
		currentOwner = owner;
		currentRepo = repo;
		return browserUri;
	});
};

const getRepositoryBranchRefsFromUri = reuseable(
	(uri: vscode.Uri, forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
		// use the cached branches if already fetched and not forceUpdate
		if (repositoryBranchRefs && repositoryBranchRefs.length && !forceUpdate) {
			return Promise.resolve(repositoryBranchRefs);
		}
		const [owner = 'conwnet', repo = 'github1s'] = uri.path
			.split('/')
			.filter(Boolean);
		return getGithubBranchRefs(owner, repo).then(
			(branchRefs: RepositoryRef[]) => (repositoryBranchRefs = branchRefs)
		);
	}
);

export const getRepositoryBranchRefs = reuseable(
	(forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
		return getBrowserUri().then((uri) =>
			getRepositoryBranchRefsFromUri(uri, forceUpdate)
		);
	}
);

const getRepositoryTagRefsFromUri = reuseable(
	(uri: vscode.Uri, forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
		// use the cached tags if already fetched and not forceUpdate
		if (repositoryTagRefs && repositoryTagRefs.length && !forceUpdate) {
			return Promise.resolve(repositoryTagRefs);
		}
		const [owner = 'conwnet', repo = 'github1s'] = uri.path
			.split('/')
			.filter(Boolean);
		return getGithubTagRefs(owner, repo).then(
			(tagRefs: RepositoryRef[]) => (repositoryTagRefs = tagRefs)
		);
	}
);

export const getRepositoryTagRefs = reuseable(
	(forceUpdate: boolean = false): Promise<RepositoryRef[]> => {
		return getBrowserUri().then((uri) =>
			getRepositoryTagRefsFromUri(uri, forceUpdate)
		);
	}
);

// try to find corresponding ref from branchNames or tagNames
const findMatchedBranchOrTag = (
	branchOrTagNames: string[],
	pathParts: string[]
): string => {
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

// get current ref(branch or tag or commit) according current browser url
const getCurrentRefFromUri = reuseable(
	(uri: vscode.Uri, forceUpdate: boolean = false): Promise<string> => {
		// cache the currentRef if we have already found it and not forceUpdate
		if (currentRef && !forceUpdate) {
			return Promise.resolve(currentRef);
		}
		// this url should looks like `https://github.com/conwnet/github1s/tree/master/src`
		const parts = uri.path.split('/').filter(Boolean);
		// only support tree/blob type now
		let maybeBranch = ['tree', 'blob'].includes((parts[2] || '').toLowerCase())
			? parts[3]
			: '';

		// if we can't get branch from url, just return `HEAD` which represents `default branch`
		if (!maybeBranch || maybeBranch.toUpperCase() === 'HEAD') {
			return Promise.resolve('HEAD');
		}

		const branchNamesPromise: Promise<
			string[]
		> = getRepositoryBranchRefsFromUri(uri).then((branchRefs) =>
			branchRefs.map((item) => item.name)
		);
		const tagNamesPromise: Promise<string[]> = getRepositoryTagRefsFromUri(
			uri
		).then((tagRefs) => tagRefs.map((item) => item.name));

		return branchNamesPromise.then((branchNames: string[]) => {
			// try to find current ref from repo branches, we needn't wait to tags request ready if can find it here
			return (
				(currentRef = findMatchedBranchOrTag(branchNames, parts)) ||
				tagNamesPromise.then((tagNames: string[]) => {
					// try to find current ref from repo tags, it we still can't find it here, just return `maybeBranch`
					// in this case, the `maybeBranch` could be a `commit hash` (or throw error later)
					return (currentRef =
						findMatchedBranchOrTag(tagNames, parts) || maybeBranch);
				})
			);
		});
	}
);

export const getCurrentRef = reuseable((forceUpdate: boolean = false) => {
	return getBrowserUri().then((uri) => getCurrentRefFromUri(uri, forceUpdate));
});

// get the github1s Uri authority from current browser url
export const getCurrentAuthority = reuseable(() => {
	if (currentRef) {
		return Promise.resolve(`${currentOwner}+${currentRepo}+${currentRef}`);
	}
	return getCurrentRef().then((ref) => `${currentOwner}+${currentRepo}+${ref}`);
});

const updateRefInUri = (uri: vscode.Uri, newRef) => {
	const parts = (uri.path || '').split('/').filter(Boolean);
	return uri.with({ path: `${parts[0]}/${parts[1]}/tree/${newRef}` });
};

export const changeCurrentRef = (newRef: string): Promise<string> => {
	return getBrowserUri().then((uri: vscode.Uri) => {
		vscode.commands.executeCommand(
			'github1s.vscode.replace-browser-url',
			updateRefInUri(uri, newRef).toString()
		);
		vscode.commands.executeCommand('workbench.action.closeAllGroups');
		currentRef = newRef;
		vscode.commands.executeCommand(
			'workbench.files.action.refreshFilesExplorer'
		);
		return newRef;
	});
};
