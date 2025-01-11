/**
 * @file checkout to another ref in status bar
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';

export const updateCheckoutTo = (() => {
	const checkoutItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	const refreshItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
	return async () => {
		const { repo, ref } = await router.getState();

		checkoutItem.text = `$(git-branch) ${ref}`;
		checkoutItem.tooltip = 'Checkout branch/tag/commit...';
		checkoutItem.command = 'github1s.commands.checkoutTo';
		repo && checkoutItem.show();

		refreshItem.text = `$(refresh)`;
		refreshItem.tooltip = 'Refresh Repository';
		refreshItem.command = 'github1s.commands.refreshRepository';
		repo && refreshItem.show();
	};
})();
