/**
 * @file register event listeners
 * @author netcon
 */

import { registerVSCodeEventListeners } from './vscode';
import { registerRouterEventListeners } from './router';

export const registerEventListeners = () => {
	registerVSCodeEventListeners();
	registerRouterEventListeners();
};
