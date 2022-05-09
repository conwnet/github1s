/**
 * @file checkout to another ref in status bar
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';

export const updateCheckoutTo = (() => {
	const checkoutItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	return async () => {
		const { ref } = await router.getState();
		checkoutItem.text = `$(git-branch) ${ref}`;
		checkoutItem.tooltip = 'Checkout branch/tag/commit...';
		checkoutItem.command = 'github1s.commands.checkoutTo';
		checkoutItem.show();
	};
})();
