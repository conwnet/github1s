import { isPlainObject } from 'lodash-es';

export interface McpServerConfig {
	type: 'http' | 'sse';
	url: string;
	headers?: Record<string, string>;
}

// Uses the mcpServers format shared by Claude Code and MCP Inspector.
export interface McpConfig {
	mcpServers: Record<string, McpServerConfig>;
}

export const parseMcpConfig = (value: unknown): McpConfig => {
	if (!isPlainObject(value)) throw new Error('MCP configuration must be a JSON object.');
	const config = value as Record<string, unknown>;
	if (Object.keys(config).some((key) => key !== 'mcpServers') || !isPlainObject(config.mcpServers)) {
		throw new Error('Expected an object containing "mcpServers", keyed by server name.');
	}
	for (const [name, value] of Object.entries(config.mcpServers as Record<string, unknown>)) {
		if (!name.trim() || !isPlainObject(value)) throw new Error('Each MCP server needs a name and an object.');
		const server = value as Record<string, unknown>;
		if (server.type !== 'http' && server.type !== 'sse') {
			throw new Error(
				`MCP server "${name}": set "type" to "http" or "sse". Local stdio servers are unavailable in the browser.`,
			);
		}
		if (Object.keys(server).some((key) => key !== 'type' && key !== 'url' && key !== 'headers')) {
			throw new Error(`MCP server "${name}": supported fields are "type", "url", and "headers".`);
		}
		let url: URL;
		try {
			if (typeof server.url !== 'string') throw new Error();
			url = new URL(server.url);
			if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
		} catch {
			throw new Error(`MCP server "${name}": "url" must be an HTTP or HTTPS URL.`);
		}
		if (
			server.headers !== undefined &&
			(!isPlainObject(server.headers) ||
				!Object.values(server.headers as Record<string, unknown>).every((value) => typeof value === 'string'))
		) {
			throw new Error(`MCP server "${name}": "headers" must contain string values.`);
		}
	}
	return value as McpConfig;
};

export const isMcpConfig = (value: unknown): value is McpConfig => {
	try {
		parseMcpConfig(value);
		return true;
	} catch {
		return false;
	}
};
