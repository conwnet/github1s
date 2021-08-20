/**
 * @file register the adapters
 * @author netcon
 */

import platformAdapterManager from './manager';
import { GitHub1sPlatformAdapter } from './github1s';

export const registerPlatformAdapters = async (): Promise<void> => {
	await platformAdapterManager.registerAdapter(new GitHub1sPlatformAdapter());
};
