/**
 * @file register the adapters
 * @author netcon
 */

import platformAdapterManager from '@/adapters/manager';
import { GitHub1sPlatformAdapter } from '@/adapters/github1s';

export const registerPlatformAdapters = (): void => {
	platformAdapterManager.registerAdapter(new GitHub1sPlatformAdapter());
};
