/**
 * @file listeners for router event
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getExtensionContext } from '@/helpers/context';
import { explorerRouterListener } from './explorer';
import { sourceControlRouterListener } from './changes';
import { historyRouterListener } from './history';
import { timelineRouterListener } from './timeline';

export const registerRouterEventListeners = () => {
	const listeners = [
		explorerRouterListener,
		sourceControlRouterListener,
		historyRouterListener,
		timelineRouterListener,
	];

	for (const listener of listeners) {
		getExtensionContext().subscriptions.push(new vscode.Disposable(router.addListener(listener)));
	}
};
