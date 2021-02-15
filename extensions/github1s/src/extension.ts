/**
 * @file extension entry
 * @author netcon
 */

import * as vscode from 'vscode';
import { GitHub1sFS } from './github1sfs';
import { SettingsView } from './settings-view';
import { setExtensionContext } from './util';
import { commandUpdateToken, commandValidateToken, commandClearToken, commandSwitchBranch, commandSwitchTag, commandGetCurrentAuthority } from './commands';

export function activate(context: vscode.ExtensionContext) {
	setExtensionContext(context);
	context.subscriptions.push(new GitHub1sFS());

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(SettingsView.viewType, new SettingsView()));

	context.subscriptions.push(vscode.commands.registerCommand('github1s.validate-token', commandValidateToken));
	context.subscriptions.push(vscode.commands.registerCommand('github1s.update-token', commandUpdateToken));
	context.subscriptions.push(vscode.commands.registerCommand('github1s.clear-token', commandClearToken));
	context.subscriptions.push(vscode.commands.registerCommand('github1s.get-current-authority', commandGetCurrentAuthority));
	context.subscriptions.push(vscode.commands.registerCommand('github1s.switch-branch', commandSwitchBranch));
	context.subscriptions.push(vscode.commands.registerCommand('github1s.switch-tag', commandSwitchTag));
}
