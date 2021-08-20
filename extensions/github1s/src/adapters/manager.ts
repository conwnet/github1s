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
		if (this.adaptersMap.has(adapter.schema)) {
			throw new Error(`Adapter schema '${adapter.schema}' is already registered.`);
		}
		this.adaptersMap.set(adapter.schema, adapter);
	}

	public getAllAdapters(): PlatformAdapter[] {
		return Array.from(this.adaptersMap.values());
	}

	public getAdapter(schema: string): PlatformAdapter {
		if (!this.adaptersMap.has(schema)) {
			throw new Error(`Adapter with schema '${schema}' can not found.`);
		}
		return this.adaptersMap.get(schema);
	}

	public getCurrentAdapter(): PlatformAdapter {
		if (!vscode.workspace.workspaceFolders.length) {
			throw new Error(`Can not found active workspace`);
		}
		const schema = vscode.workspace.workspaceFolders[0].uri.scheme;
		return this.getAdapter(schema);
	}
}

export default PlatformAdapterManager.getInstance();
