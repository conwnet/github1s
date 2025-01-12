/**
 * @file GitHub1s Ref Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { relativeTimeTo } from '@/helpers/date';
import { getRecentRepositories, removeRecentRepository } from '@/helpers/context';
import { adapterManager } from '@/adapters';

export const commandOpenOnOfficialPage = async () => {
	const location = (await router.getHistory()).location;
	const routerParser = await router.resolveParser();
	const fullPath = `${location.pathname}${location.search}${location.hash}`;
	const externalLink = await routerParser.buildExternalLink(fullPath);

	return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(externalLink));
};

const repoPickItemButtons = [{ iconPath: new vscode.ThemeIcon('close') }];

const getRecentRepoPickItems = () =>
	getRecentRepositories().map((record) => ({
		label: record.name,
		description: relativeTimeTo(record.timestamp),
		buttons: repoPickItemButtons,
	}));

export const commandOpenRepository = async () => {
	const quickPick = vscode.window.createQuickPick();
	const manualInputItem = { label: '' };
	let recentRepoPickItems = getRecentRepoPickItems();

	const updatePickerItems = () => {
		if (manualInputItem.label) {
			return (quickPick.items = [...recentRepoPickItems, manualInputItem]);
		}
		return (quickPick.items = recentRepoPickItems);
	};

	quickPick.placeholder = 'Select to open...';
	updatePickerItems();

	quickPick.show();
	quickPick.onDidTriggerItemButton(async (event) => {
		if (event.button === repoPickItemButtons[0]) {
			await removeRecentRepository(event.item.label);
			recentRepoPickItems = getRecentRepoPickItems();
			updatePickerItems();
		}
	});

	quickPick.onDidChangeValue((value) => {
		manualInputItem.label = value ? `Open ${value}...` : '';
		updatePickerItems();
	});

	quickPick.onDidAccept(async () => {
		const choice = quickPick.activeItems[0];
		const repository = choice === manualInputItem ? quickPick.value : choice.label;
		const targetLink = vscode.Uri.parse((await router.href()) || '').with({
			path: await (await router.resolveParser()).buildTreePath(repository),
		});
		vscode.commands.executeCommand('vscode.open', targetLink);
		quickPick.hide();
	});
};

const commandOpenOnlineEditor = async () => {
	const currentScheme = adapterManager.getCurrentScheme();
	const onlineEditorPath = ['github1s', 'ossinsight'].includes(currentScheme) ? '/editor' : '/';
	const targetLink = vscode.Uri.parse((await router.href()) || '').with({ path: onlineEditorPath });
	return vscode.commands.executeCommand('vscode.open', targetLink);
};

const commandRefreshRepository = async () => {
	if (['github1s', 'gitlab1s'].includes(adapterManager.getCurrentScheme())) {
		await vscode.commands.executeCommand('github1s.commands.syncSourcegraphRepository');
	}
	vscode.commands.executeCommand('workbench.action.reloadWindow');
};

export const registerGlobalCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.openOnGitHub', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnGitLab', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnBitbucket', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnNpm', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openOnOfficialPage', commandOpenOnOfficialPage),
		vscode.commands.registerCommand('github1s.commands.openRepository', commandOpenRepository),
		vscode.commands.registerCommand('github1s.commands.openOnlineEditor', commandOpenOnlineEditor),
		vscode.commands.registerCommand('github1s.commands.refreshRepository', commandRefreshRepository),
		vscode.commands.registerCommand('remoteHub.openRepository', commandOpenRepository),
	);
};
