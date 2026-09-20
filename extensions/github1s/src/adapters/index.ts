/**
 * @file register the adapters
 * @author netcon
 */

import adapterManager from './manager';
import { GitHub1sAdapter } from './github1s';
import { GitLab1sAdapter } from './gitlab1s';
import { BitbucketAdapter } from './bitbucket1s';
import { Npmjs1sAdapter } from './npmjs1s';
import { DiscoveryAdapter } from './discovery';
import { Adapter, DataSource, PlatformName, RouterParser } from './types';
import { setVSCodeContext } from '@/helpers/vscode';

const emptyAdapter = {
	scheme: 'empty',
	platformName: PlatformName.GitHub,
	resolveDataSource: () => new DataSource(),
	resolveRouterParser: () => new RouterParser(),
};

export const registerAdapters = async (): Promise<void> => {
	await Promise.all([
		adapterManager.registerAdapter(emptyAdapter),
		adapterManager.registerAdapter(new GitHub1sAdapter()),
		adapterManager.registerAdapter(new GitLab1sAdapter()),
		adapterManager.registerAdapter(new BitbucketAdapter()),
		adapterManager.registerAdapter(new Npmjs1sAdapter()),
		adapterManager.registerAdapter(new DiscoveryAdapter()),
	]);
	await setVSCodeContext('github1s:views:codeReviewList:visible', await supportsCodeReviewFeatures());
	await setVSCodeContext('github1s:features:gutterBlame:enabled', await supportsGutterBlameFeatures());
};

export const getAdapter = (scheme?: string): Adapter => {
	return adapterManager.getAdapter(scheme);
};

export const getAllAdapters = (): Adapter[] => {
	return adapterManager.getAllAdapters();
};

export const supportsDataSourceMethods = async (
	methods: (keyof DataSource)[],
	scheme: string = getAdapter().scheme,
): Promise<boolean> => {
	const adapter = getAllAdapters().find((adapter) => adapter.scheme === scheme);
	if (!adapter) {
		return false;
	}
	const dataSource = await adapter.resolveDataSource();
	// Inherited default methods return empty results and do not indicate support.
	return methods.every((method) => dataSource[method] !== DataSource.prototype[method]);
};

export const supportsCommitFeatures = (scheme?: string): Promise<boolean> => {
	return supportsDataSourceMethods(['provideCommits', 'provideCommit', 'provideCommitChangedFiles'], scheme);
};

export const supportsCodeReviewFeatures = (scheme?: string): Promise<boolean> => {
	return supportsDataSourceMethods(
		['provideCodeReviews', 'provideCodeReview', 'provideCodeReviewChangedFiles'],
		scheme,
	);
};

export const supportsGutterBlameFeatures = (scheme?: string): Promise<boolean> => {
	return supportsDataSourceMethods(['provideFileBlameRanges'], scheme);
};
