/**
 * @file extension context
 * @author netcon
 */

import * as vscode from 'vscode';

let extensionContext: vscode.ExtensionContext | null = null;

export const setExtensionContext = (_extensionContext: vscode.ExtensionContext) => {
	extensionContext = _extensionContext;
};

export const getExtensionContext = (): vscode.ExtensionContext => {
	if (!extensionContext) {
		throw new Error('extension context initialize failed!');
	}

	return extensionContext;
};

const RECENT_REPOSITORIES = 'github1s-recent-repositories';
export const getRecentRepositories = (): { name: string; timestamp: number }[] => {
	return getExtensionContext().globalState.get(RECENT_REPOSITORIES) || [];
};

export const addRecentRepositories = (name: string, timestamp = 0) => {
	const currentRecord = { name, timestamp: timestamp || Date.now() };
	const restRecords = getRecentRepositories().filter((record) => record.name !== name);
	const newRecords = [currentRecord, ...restRecords.slice(0, 49)]; // max to 50 records
	return getExtensionContext().globalState.update(RECENT_REPOSITORIES, newRecords);
};

export const removeRecentRepository = (name: string) => {
	const newRecords = getRecentRepositories().filter((record) => record.name !== name);
	return getExtensionContext().globalState.update(RECENT_REPOSITORIES, newRecords);
};

export const getBrowserUrl = () => {
	return vscode.commands.executeCommand('github1s.commands.vscode.getBrowserUrl');
};
