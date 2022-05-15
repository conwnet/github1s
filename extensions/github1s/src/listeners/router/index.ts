/**
 * @file listeners for router event
 * @author netcon
 */

import router from '@/router';
import { explorerRouterListener } from './explorer';
import { sourceControlRouterListener } from './changes';

export const registerRouterEventListeners = () => {
	router.addListener(explorerRouterListener);
	router.addListener(sourceControlRouterListener);
};
