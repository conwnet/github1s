/**
 * @file register the adapters
 * @author netcon
 */

import adapterManager from './manager';
import { GitHub1sAdapter } from './github1s';

export const registerAdapters = async (): Promise<void> => {
	await adapterManager.registerAdapter(new GitHub1sAdapter());
};

export { adapterManager };
