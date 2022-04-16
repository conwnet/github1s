/**
 * @file Manages the adapters.
 * @author netcon
 */

import * as vscode from 'vscode';
import { Adapter, Promisable } from './types';

export class AdapterManager {
	private static instance: AdapterManager | null = null;
	private adaptersMap: Map<string, Adapter> = new Map();

	private constructor() {}

	public static getInstance(): AdapterManager {
		if (AdapterManager.instance) {
			return AdapterManager.instance;
		}
		return (AdapterManager.instance = new AdapterManager());
	}

	public registerAdapter(adapter: Adapter): Promisable<void> {
		if (this.adaptersMap.has(adapter.scheme)) {
			throw new Error(`Adapter scheme '${adapter.scheme}' is already registered.`);
		}
		this.adaptersMap.set(adapter.scheme, adapter);
		if (this.getCurrentScheme() === adapter.scheme && adapter.activateAsDefault) {
			return adapter.activateAsDefault();
		}
	}

	public getAllAdapters(): Adapter[] {
		return Array.from(this.adaptersMap.values());
	}

	public getAdapter(scheme: string): Adapter {
		if (!this.adaptersMap.has(scheme)) {
			throw new Error(`Adapter with scheme '${scheme}' can not found.`);
		}
		return this.adaptersMap.get(scheme)!;
	}

	public getCurrentScheme(): string {
		if (!vscode.workspace.workspaceFolders?.length) {
			throw new Error(`Can not found active workspace`);
		}
		return vscode.workspace.workspaceFolders[0].uri.scheme;
	}

	public getCurrentAdapter(): Adapter {
		const scheme = this.getCurrentScheme();
		return this.getAdapter(scheme);
	}
}

export default AdapterManager.getInstance();
