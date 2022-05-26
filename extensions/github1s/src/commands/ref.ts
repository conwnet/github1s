/**
 * @file GitHub1s Ref Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { adapterManager } from '@/adapters';
import { Repository } from '@/repository';

const loadMorePickerItem: vscode.QuickPickItem = {
	label: '$(more) Load More',
	alwaysShow: true,
};

const checkoutToItem: vscode.QuickPickItem = {
	label: '$(debug-disconnect) Checkout detached',
	alwaysShow: true,
};

// check out to branch/tag/commit
const commandCheckoutTo = async () => {
	const routerParser = await router.resolveParser();
	const routeState = await router.getState();
	const quickPick = vscode.window.createQuickPick();

	const loadMoreRefPickerItems = async () => {
		quickPick.busy = true;
		const scheme = adapterManager.getCurrentScheme();
		const repository = Repository.getInstance(scheme, routeState.repo);
		await Promise.all([repository.loadMoreBranches(), repository.loadMoreTags()]);
		const [branchRefs, tagRefs] = await Promise.all([repository.getBranchList(), repository.getTagList()]);
		const refPickerItems = [...branchRefs, ...tagRefs].map((ref) => ({
			label: ref.name,
			description: ref.description,
		}));
		const hasMore = (await Promise.all([repository.hasMoreBranches(), repository.hasMoreTags()])).some(Boolean);
		quickPick.items = [...refPickerItems, hasMore ? loadMorePickerItem : null!, checkoutToItem].filter(Boolean);
		quickPick.busy = false;
	};

	quickPick.placeholder = 'Input a ref to checkout';
	quickPick.items = [checkoutToItem];
	loadMoreRefPickerItems();
	quickPick.show();

	quickPick.onDidAccept(async () => {
		const choice = quickPick.activeItems[0];
		if (choice === loadMorePickerItem) {
			return loadMoreRefPickerItems();
		}
		const selectedRef = choice === checkoutToItem ? quickPick.value : choice?.label;
		const targetRef = selectedRef.toUpperCase() !== 'HEAD' ? selectedRef : undefined;
		router.push(await routerParser.buildTreePath(routeState.repo, targetRef));
		quickPick.hide();
	});
};

export const registerRefCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(vscode.commands.registerCommand('github1s.commands.checkoutTo', commandCheckoutTo));
};
