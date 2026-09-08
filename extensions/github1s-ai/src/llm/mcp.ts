import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import type { ToolSet } from 'ai';

import type { McpConfig } from '@/common/mcp-config';

export const connectMcpTools = async (config: McpConfig, signal: AbortSignal) => {
	const clients: MCPClient[] = [];
	const tools: ToolSet = {};
	const close = async () => {
		await Promise.allSettled(clients.splice(0).map((client) => client.close()));
	};

	try {
		for (const [name, server] of Object.entries(config.mcpServers)) {
			signal.throwIfAborted();
			let client: MCPClient;
			try {
				client = await createMCPClient({
					transport: {
						...server,
						// Bound session cleanup even if a server stops responding to DELETE.
						fetch: (input, init) =>
							globalThis.fetch(
								input,
								init?.method === 'DELETE' ? { ...init, signal: AbortSignal.timeout(5000) } : init,
							),
					},
					initializationOptions: { signal, timeout: 10000 },
					onUncaughtError: () => undefined,
				});
				clients.push(client);
				let cursor: string | undefined;
				do {
					const definitions = await client.listTools({ params: { cursor }, options: { signal, timeout: 10000 } });
					for (const [toolName, tool] of Object.entries(client.toolsFromDefinitions(definitions))) {
						const qualifiedName = `mcp__${name}__${toolName}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
						if (Object.hasOwn(tools, qualifiedName)) throw new Error('Duplicate MCP tool name.');
						tools[qualifiedName] = tool;
					}
					cursor = definitions.nextCursor;
				} while (cursor !== undefined);
			} catch {
				signal.throwIfAborted();
				throw new Error(
					`Unable to load MCP tools from "${name}". Check the server URL, authentication, CORS, and unique tool names.`,
				);
			}
		}
		return { tools, close };
	} catch (error) {
		await close();
		throw error;
	}
};
