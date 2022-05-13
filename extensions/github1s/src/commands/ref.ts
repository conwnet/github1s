/**
 * @file GitHub1s Ref Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { adapterManager } from '@/adapters';
import { Repository } from '@/repository';

// check out to branch/tag/commit
const commandCheckoutTo = async () => {
	const routerParser = await router.resolveParser();
	const routeState = await router.getState();

	const scheme = adapterManager.getCurrentScheme();
	const repository = Repository.getInstance(scheme, routeState.repo);
	const [branchRefs, tagRefs] = await Promise.all([repository.getBranchList(), repository.getTagList()]);
	const branchPickerItems: vscode.QuickPickItem[] = branchRefs.map((branchRef) => ({
		label: branchRef.name,
		description: (branchRef.commitSha || '').slice(0, 8),
	}));
	const tagPickerItems: vscode.QuickPickItem[] = tagRefs.map((tagRef) => ({
		label: tagRef.name,
		description: `Tag at ${(tagRef.commitSha || '').slice(0, 8)}`,
	}));

	const quickPick = vscode.window.createQuickPick();
	quickPick.placeholder = routeState.ref;
	quickPick.items = [...branchPickerItems, ...tagPickerItems];

	quickPick.show();
	const choice = await new Promise<vscode.QuickPickItem | undefined>((resolve) =>
		quickPick.onDidAccept(() => resolve(quickPick.activeItems[0]))
	);
	quickPick.hide();

	const selectedRef = choice?.label || quickPick.value;
	if (selectedRef) {
		const targetRef = selectedRef.toUpperCase() !== 'HEAD' ? selectedRef : undefined;
		router.push(await routerParser.buildTreePath(routeState.repo, targetRef));
	}
};

export const registerRefCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(vscode.commands.registerCommand('github1s.commands.checkoutTo', commandCheckoutTo));
};
