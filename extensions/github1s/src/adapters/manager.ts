/**
 * @file Manages the adapters.
 * @author netcon
 */

import { PlatformAdapter } from 'github1s';

export class PlatformAdapterManager {
	private static instance: PlatformAdapterManager = null;
	private adaptersMap: Map<string, PlatformAdapter> = new Map();

	public static getInstance(): PlatformAdapterManager {
		if (PlatformAdapterManager.instance) {
			return PlatformAdapterManager.instance;
		}
		return (PlatformAdapterManager.instance = new PlatformAdapterManager());
	}

	public registerAdapter(adapter: PlatformAdapter) {
		if (this.adaptersMap.has(adapter.name)) {
			throw new Error(`Adapter schema '${adapter.schema}' is already registered.`);
		}
		this.adaptersMap.set(adapter.name, adapter);
	}

	public getAllAdapters(): PlatformAdapter[] {
		return Array.from(this.adaptersMap.values());
	}

	public getAdapter(schema: string): PlatformAdapter | null {
		return this.adaptersMap.get(schema) || null;
	}
}

export default PlatformAdapterManager.getInstance();
