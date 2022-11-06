/**
 * @file register the adapters
 * @author netcon
 */

import adapterManager from './manager';
import { GitHub1sAdapter } from './github1s';
import { GitLab1sAdapter } from './gitlab1s';
import { BitbucketAdapter } from './bitbucket1s';
import { Npmjs1sAdapter } from './npmjs1s';
import { OSSInsightAdapter } from './ossinsight';
import { DataSource, PlatformName, RouterParser } from './types';

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
		adapterManager.registerAdapter(new OSSInsightAdapter()),
	]);
};

export { adapterManager };
