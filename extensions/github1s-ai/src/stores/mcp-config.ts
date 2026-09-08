import type * as vscode from 'vscode';

import { isMcpConfig, parseMcpConfig, type McpConfig } from '@/common/mcp-config';

import { MementoPersist } from './common';

const MCP_CONFIG_STORAGE_KEY = 'GITHUB1S-AI.MCP_CONFIG';

export class McpConfigStore {
	private readonly persist: MementoPersist<McpConfig>;

	constructor(context: vscode.ExtensionContext) {
		this.persist = new MementoPersist({
			memento: context.globalState,
			storeKey: MCP_CONFIG_STORAGE_KEY,
			check: isMcpConfig,
		});
	}

	async get(): Promise<McpConfig> {
		return (await this.persist.read()) ?? { mcpServers: {} };
	}

	async set(config: McpConfig): Promise<void> {
		await this.persist.write(parseMcpConfig(config));
	}

	async clear(): Promise<void> {
		await this.persist.delete();
	}
}
