/**
 * @file Manages the adapters.
 * @author netcon
 */

import * as vscode from 'vscode';
import { PlatformAdapter } from './types';

export class PlatformAdapterManager {
	private static instance: PlatformAdapterManager = null;
	private adaptersMap: Map<string, PlatformAdapter> = new Map();

	private constructor() {}

	public static getInstance(): PlatformAdapterManager {
		if (PlatformAdapterManager.instance) {
			return PlatformAdapterManager.instance;
		}
		return (PlatformAdapterManager.instance = new PlatformAdapterManager());
	}

	public registerAdapter(adapter: PlatformAdapter) {
		if (this.adaptersMap.has(adapter.scheme)) {
			throw new Error(`Adapter scheme '${adapter.scheme}' is already registered.`);
		}
		this.adaptersMap.set(adapter.scheme, adapter);
	}

	public getAllAdapters(): PlatformAdapter[] {
		return Array.from(this.adaptersMap.values());
	}

	public getAdapter(scheme: string): PlatformAdapter {
		if (!this.adaptersMap.has(scheme)) {
			throw new Error(`Adapter with scheme '${scheme}' can not found.`);
		}
		return this.adaptersMap.get(scheme);
	}

	public getCurrentAdapter(): PlatformAdapter {
		if (!vscode.workspace.workspaceFolders.length) {
			throw new Error(`Can not found active workspace`);
		}
		const scheme = vscode.workspace.workspaceFolders[0].uri.scheme;
		return this.getAdapter(scheme);
	}
}

export default PlatformAdapterManager.getInstance();
