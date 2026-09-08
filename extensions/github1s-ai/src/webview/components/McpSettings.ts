import { html } from 'htm/preact';
import type { VNode } from 'preact';
import { useState } from 'preact/hooks';

import type { McpConfig } from '@/common/mcp-config';

const EXAMPLE_CONFIG = JSON.stringify(
	{
		mcpServers: {
			example: {
				type: 'http',
				url: 'https://example.com/mcp',
				headers: { Authorization: 'Bearer YOUR_TOKEN' },
			},
		},
	},
	null,
	2,
);

interface McpSettingsProps {
	config?: McpConfig;
	notice: VNode;
	onSave: (json: string) => void;
}

export const McpSettings = ({ config, notice, onSave }: McpSettingsProps) => {
	const [draft, setDraft] = useState(() => JSON.stringify(config ?? { mcpServers: {} }, null, 2));
	return html`<form
		id="settings-mcp-panel"
		class="settings-overview"
		role="tabpanel"
		aria-labelledby="settings-mcp-tab"
		onSubmit=${(event: SubmitEvent) => {
			event.preventDefault();
			onSave(draft);
		}}
	>
		<p class="settings-section-description">
			Connect remote MCP servers to make their tools available in chat. Supports HTTP and SSE with optional
			authentication headers.
		</p>
		${notice}
		<label class="settings-field">
			<span>MCP configuration (JSON)</span>
			<textarea
				class="settings-control settings-prompt-control settings-mcp-control"
				rows="12"
				spellcheck="false"
				value=${draft}
				onInput=${(event: InputEvent) => setDraft((event.currentTarget as HTMLTextAreaElement).value)}
			></textarea>
		</label>
		<details>
			<summary>Example configuration</summary>
			<pre class="settings-mcp-example">${EXAMPLE_CONFIG}</pre>
		</details>
		<div class="settings-form-actions">
			<button class="primary" type="submit">Save MCP settings</button>
		</div>
	</form>`;
};
