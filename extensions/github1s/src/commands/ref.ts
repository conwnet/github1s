/**
 * @file GitHub1s Ref Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { adapterManager } from '@/adapters';

// check out to branch/tag/commit
const commandCheckoutTo = async () => {
	const currentAdapter = adapterManager.getCurrentAdapter();
	const dataSource = await currentAdapter.resolveDataSource();
	const routerParser = await currentAdapter.resolveRouterParser();
	const { repo: currentRepo, ref: currentRef } = await router.getState();

	const [branchRefs, tagRefs] = await Promise.all([
		dataSource.provideBranches(currentRepo, { page: 1, pageSize: 100 }),
		dataSource.provideTags(currentRepo, { page: 1, pageSize: 100 }),
	]);
	const branchPickerItems: vscode.QuickPickItem[] = branchRefs.map((branchRef) => ({
		label: branchRef.name,
		description: (branchRef.commitSha || '').slice(0, 8),
	}));
	const tagPickerItems: vscode.QuickPickItem[] = tagRefs.map((tagRef) => ({
		label: tagRef.name,
		description: `Tag at ${(tagRef.commitSha || '').slice(0, 8)}`,
	}));

	const quickPick = vscode.window.createQuickPick();
	quickPick.placeholder = currentRef;
	quickPick.items = [...branchPickerItems, ...tagPickerItems];

	quickPick.show();
	const choice = await new Promise<vscode.QuickPickItem | undefined>((resolve) =>
		quickPick.onDidAccept(() => resolve(quickPick.activeItems[0]))
	);
	quickPick.hide();

	const selectedRef = choice?.label || quickPick.value;
	if (selectedRef) {
		const targetRef = selectedRef.toUpperCase() !== 'HEAD' ? selectedRef : undefined;
		router.push(await routerParser.buildTreePath(currentRepo, targetRef));
	}
};

export const registerRefCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.checkout-to', commandCheckoutTo)
	);
};
