/**
 * @file register the adapters
 * @author netcon
 */

import adapterManager from './manager';
import { GitHub1sAdapter } from './github1s';
import { GitLab1sAdapter } from './gitlab1s';

export const registerAdapters = async (): Promise<void> => {
	await Promise.all([
		adapterManager.registerAdapter(new GitHub1sAdapter()),
		adapterManager.registerAdapter(new GitLab1sAdapter()),
	]);
};

export { adapterManager };
