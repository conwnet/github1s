/**
 * @file GitHub1s Ref Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import repository from '@/repository';

export const commandGetCurrentAuthority = () => router.getAuthority();

export const commandCheckoutRef = async () => {
	const [branchRefs, tagRefs] = await Promise.all([
		repository.getBranches(),
		repository.getTags(),
	]);
	const branchPickerItems: vscode.QuickPickItem[] = branchRefs.map(
		(branchRef) => ({
			label: branchRef.name,
			description: (branchRef.object?.sha || '').slice(0, 8),
		})
	);
	const tagPickerItems: vscode.QuickPickItem[] = tagRefs.map((tagRef) => ({
		label: tagRef.name,
		description: `Tag at ${(tagRef.object?.sha || '').slice(0, 8)}`,
	}));

	const quickPick = vscode.window.createQuickPick();
	const routerState = await router.getState();
	quickPick.placeholder = routerState.ref;
	quickPick.items = [...branchPickerItems, ...tagPickerItems];

	quickPick.show();
	const choice = await new Promise<vscode.QuickPickItem | undefined>(
		(resolve) => quickPick.onDidAccept(() => resolve(quickPick.activeItems[0]))
	);
	quickPick.hide();

	const targetRef = choice?.label || quickPick.value;
	if (targetRef.toUpperCase() === 'HEAD') {
		router.replace(`/${routerState.owner}/${routerState.repo}`);
		return;
	}
	router.replace(`/${routerState.owner}/${routerState.repo}/tree/${targetRef}`);
};
