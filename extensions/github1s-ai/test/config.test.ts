import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseMcpConfig } from '@/common/mcp-config';
import { isModelConfig, isModelConfigInput, type ModelConfigInput } from '@/common/model-config';
import { normalizePromptsConfig, resolvePrompts } from '@/common/prompts-config';

const model: ModelConfigInput = {
	name: 'Test model',
	provider: 'openai',
	protocol: 'openai-responses',
	baseURL: 'https://example.com/v1',
	apiKey: 'test-api-key',
	modelId: 'test-model',
};

test('model configs accept supported providers and require a saved API key', () => {
	const configs: ModelConfigInput[] = [
		model,
		{ ...model, provider: 'custom', protocol: 'openai-chat' },
		{ ...model, provider: 'anthropic', protocol: 'anthropic-messages' },
	];
	for (const config of configs) {
		assert.equal(isModelConfigInput(config), true);
		assert.equal(isModelConfig({ ...config, id: 'model-1' }), true);
	}
	assert.equal(isModelConfig(model), false);
	assert.equal(isModelConfigInput({ ...model, id: 'model-1', apiKey: '' }), true);
	assert.equal(isModelConfig({ ...model, id: 'model-1', apiKey: ' ' }), false);
});

test('model configs reject incompatible protocols and invalid endpoints', () => {
	assert.equal(isModelConfigInput({ ...model, protocol: 'anthropic-messages' }), false);
	assert.equal(isModelConfigInput({ ...model, modelId: ' ' }), false);
	for (const baseURL of [
		'not-a-url',
		'file:///tmp/model',
		'https://user:password@example.com/v1',
		'https://example.com/v1?apiKey=secret',
		'https://example.com/v1#fragment',
	]) {
		assert.equal(isModelConfigInput({ ...model, baseURL }), false, baseURL);
	}
});

test('MCP config accepts HTTP and SSE servers with optional headers', () => {
	const config = {
		mcpServers: {
			docs: { type: 'http', url: 'https://example.com/mcp', headers: { Authorization: 'Bearer test' } },
			local: { type: 'sse', url: 'http://localhost:3000/sse' },
		},
	};
	assert.deepEqual(parseMcpConfig(config), config);
	assert.deepEqual(parseMcpConfig({ mcpServers: {} }), { mcpServers: {} });
});

test('MCP config rejects unsupported transports, URLs and non-string headers', () => {
	assert.throws(() => parseMcpConfig({}), /mcpServers/);
	for (const [server, error] of [
		[{ type: 'stdio', command: 'node' }, /stdio/],
		[{ type: 'http', url: 'file:///tmp/mcp' }, /HTTP or HTTPS/],
		[{ type: 'http', url: 'https://example.com', headers: { Authorization: 123 } }, /string values/],
	] as const) {
		assert.throws(() => parseMcpConfig({ mcpServers: { docs: server } }), error);
	}
});

test('prompts normalize empty settings and merge overrides with defaults', () => {
	assert.equal(normalizePromptsConfig({ instructions: ' ', userRules: '\n', quickActions: {} }), undefined);
	const config = normalizePromptsConfig({
		instructions: ' Custom instructions. ',
		userRules: ' Answer in Chinese. ',
		quickActions: { repositoryOverview: 'Summarize this repository.', explainSelection: '' },
	});
	assert.deepEqual(config, {
		instructions: 'Custom instructions.',
		userRules: 'Answer in Chinese.',
		quickActions: { repositoryOverview: 'Summarize this repository.' },
	});
	const prompts = resolvePrompts(config);
	assert.equal(prompts.instructions, 'Custom instructions.\n\nUser Rules:\nAnswer in Chinese.');
	assert.equal(prompts.quickActions.repositoryOverview, 'Summarize this repository.');
	assert.equal(prompts.quickActions.explainSelection, 'Explain the selected code.');
	assert.match(resolvePrompts(undefined).instructions, /read-only code assistant/);
});
