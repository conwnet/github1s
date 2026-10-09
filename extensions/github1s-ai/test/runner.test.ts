import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { before, test } from 'node:test';

import { createAssistantMessage, createUserMessage, withMessageStatus, type Conversation } from '@/common/conversation';
import type { ModelConfig } from '@/common/model-config';
import type { Stores } from '@/stores';
import { createRuntimeStateStore } from '@/stores/runtime-state';

let ConversationRunner: typeof import('@/controllers/runner').ConversationRunner;

before(async () => {
	// Retrying snapshots must not read VS Code documents or execute repository tools.
	const hooks = registerHooks({
		resolve: (specifier, context, next) =>
			specifier === 'vscode' ? { url: 'mock:vscode', shortCircuit: true } : next(specifier, context),
		load: (url, context, next) =>
			url === 'mock:vscode'
				? { format: 'commonjs', source: 'module.exports = {};', shortCircuit: true }
				: next(url, context),
	});
	try {
		({ ConversationRunner } = await import('@/controllers/runner'));
	} finally {
		hooks.deregister();
	}
});

const setup = async () => {
	const user = createUserMessage(
		'turn-1',
		'Original question',
		[{ id: 'original-file', type: 'file', label: 'a.ts', source: 'github1s:/a.ts', content: 'original file snapshot' }],
		[{ source: 'github1s:/original.ts' }],
	);
	const assistant = withMessageStatus(createAssistantMessage('old-assistant', 'turn-1'), 'failed', 'Old error');
	assistant.parts.push({ type: 'text', text: 'Old partial answer' });
	let conversation: Conversation = {
		id: 'conversation-1',
		title: 'Original title',
		createdAt: 1,
		updatedAt: 1,
		messages: [user, assistant],
	};
	const runtime = createRuntimeStateStore();
	await runtime.set({
		page: 'chat',
		chat: {
			conversation,
			pendingAttachments: [{ id: 'pending-file', type: 'file', label: 'draft.ts', source: 'github1s:/draft.ts' }],
			recentFiles: [{ source: 'github1s:/current.ts' }],
		},
		history: {},
		settings: {},
	});
	const config: ModelConfig = {
		id: 'current-config',
		name: 'Current config',
		provider: 'openai',
		protocol: 'openai-chat',
		modelId: 'current-model',
		apiKey: 'test-key',
		baseURL: 'https://model.example/v1',
	};
	const stores = {
		runtime,
		modelConfigs: { getSelected: async () => config },
		promptsConfig: { get: async () => ({ instructions: 'Current instructions', userRules: '', quickActions: {} }) },
		mcpConfig: { get: async () => ({ mcpServers: {} }) },
		conversations: {
			get: async () => conversation,
			update: async (_id: string, update: Partial<Conversation>) => {
				conversation = { ...conversation, ...update };
			},
			select: async () => {},
		},
	} as unknown as Stores;
	return { stores, user, runner: new ConversationRunner(stores, async () => {}), getConversation: () => conversation };
};

const response = () =>
	new Response(
		[
			{
				id: 'response-1',
				object: 'chat.completion.chunk',
				created: 1,
				model: 'current-model',
				choices: [{ index: 0, delta: { role: 'assistant', content: 'New answer' }, finish_reason: null }],
			},
			{
				id: 'response-1',
				object: 'chat.completion.chunk',
				created: 1,
				model: 'current-model',
				choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
			},
		]
			.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
			.join('') + 'data: [DONE]\n\n',
		{ headers: { 'Content-Type': 'text/event-stream' } },
	);

test('retry replaces the failed reply using the original context and current settings', async (t) => {
	const { stores, user, runner, getConversation } = await setup();
	const fetch = t.mock.method(globalThis, 'fetch', async () => response());
	await runner.send({ retryMessageId: 'old-assistant' });
	assert.equal(fetch.mock.callCount(), 1);
	const request = JSON.parse(fetch.mock.calls[0].arguments[1]?.body as string);
	assert.equal(request.model, 'current-model');
	assert.deepEqual(
		request.messages.map((message: { role: string }) => message.role),
		['system', 'user'],
	);
	assert.match(JSON.stringify(request.messages), /Current instructions/);
	assert.match(JSON.stringify(request.messages), /original file snapshot/);
	assert.match(JSON.stringify(request.messages), /original\.ts/);
	assert.doesNotMatch(JSON.stringify(request.messages), /Old partial answer|draft\.ts|current\.ts/);
	const conversation = getConversation();
	assert.equal(conversation.messages.length, 2);
	assert.deepEqual(conversation.messages[0], user);
	assert.notEqual(conversation.messages[1].id, 'old-assistant');
	assert.equal(conversation.messages[1].metadata.turnId, user.metadata.turnId);
	assert.equal(conversation.messages[1].metadata.status, 'completed');
	assert.equal(conversation.messages[1].parts.find((part) => part.type === 'text')?.text, 'New answer');
	assert.equal(conversation.messages[1].metadata.error, undefined);
	assert.equal((await stores.runtime.get()).chat.pendingAttachments?.[0].id, 'pending-file');
});
