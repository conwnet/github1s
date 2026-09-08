import type * as vscode from 'vscode';

import type { RuntimeState } from '@/common/state';

import { ConversationsStore } from './conversations';
import { McpConfigStore } from './mcp-config';
import { ModelConfigsStore } from './model-configs';
import { PromptsConfigStore } from './prompts-config';
import { createRuntimeStateStore, type StateStore } from './runtime-state';

export interface Stores {
	readonly runtime: StateStore<RuntimeState>;
	readonly modelConfigs: Pick<
		ModelConfigsStore,
		'list' | 'get' | 'getSelected' | 'select' | 'append' | 'update' | 'delete' | 'clear'
	>;
	readonly mcpConfig: Pick<McpConfigStore, 'get' | 'set' | 'clear'>;
	readonly promptsConfig: Pick<PromptsConfigStore, 'get' | 'set' | 'clear'>;
	readonly conversations: Pick<
		ConversationsStore,
		'list' | 'get' | 'getSelected' | 'select' | 'append' | 'update' | 'delete' | 'clearGlobal'
	>;
}

export const createStores = async (context: vscode.ExtensionContext): Promise<Stores> => {
	let workspaceKey = 'empty-workspace';
	if (context.storageUri) {
		const bytes = new TextEncoder().encode(context.storageUri.toString());
		const digest = await crypto.subtle.digest('SHA-1', bytes);
		workspaceKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
	}
	return {
		runtime: createRuntimeStateStore(),
		modelConfigs: new ModelConfigsStore(context),
		mcpConfig: new McpConfigStore(context),
		promptsConfig: new PromptsConfigStore(context),
		conversations: new ConversationsStore(context, workspaceKey),
	};
};
