import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { before, test } from 'node:test';

import {
	createAssistantMessage,
	createUserMessage,
	validateConversationMessages,
	withMessageStatus,
	type Conversation,
} from '@/common/conversation';
import type { ModelConfig } from '@/common/model-config';
import type { Stores } from '@/stores';
import { createRuntimeStateStore } from '@/stores/runtime-state';

let ConversationRunner: typeof import('@/controllers/runner').ConversationRunner;

before(async () => {
	// Conversation actions use snapshots without reading VS Code documents or executing repository tools.
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
	const assistant = withMessageStatus(
		createAssistantMessage('old-assistant', { turnId: 'turn-1' }),
		'failed',
		'Old error',
	);
	assistant.parts.push({ type: 'text', text: 'Old partial answer' });
	const conversation: Conversation = {
		id: 'conversation-1',
		title: 'Original title',
		createdAt: 1,
		updatedAt: 1,
		messages: [user, assistant],
	};
	const savedConversations = new Map([[conversation.id, conversation]]);
	let selectedId: string | undefined = conversation.id;
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
			get: async (id: string) => savedConversations.get(id),
			append: async (item: Conversation) => {
				savedConversations.set(item.id, item);
			},
			update: async (id: string, update: Partial<Conversation>) => {
				savedConversations.set(id, { ...savedConversations.get(id)!, ...update });
			},
			select: async (id: string | undefined) => {
				selectedId = id;
			},
		},
	} as unknown as Stores;
	return {
		stores,
		user,
		runner: new ConversationRunner(stores, async () => {}),
		getConversation: () => savedConversations.get(conversation.id)!,
		getSelectedId: () => selectedId,
	};
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
	await runner.retry('old-assistant');
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
	assert.equal(conversation.messages[1].metadata.modelId, 'current-model');
	assert.ok(conversation.messages[1].metadata.createdAt! > 1);
	assert.equal(conversation.messages[1].parts.find((part) => part.type === 'text')?.text, 'New answer');
	assert.equal(conversation.messages[1].metadata.error, undefined);
	assert.equal((await stores.runtime.get()).chat.pendingAttachments?.[0].id, 'pending-file');
	assert.deepEqual(await validateConversationMessages(conversation.messages), conversation.messages);
});

test('regenerating a completed reply preserves earlier history and removes later turns', async (t) => {
	const { stores, runner, getConversation } = await setup();
	const previous = getConversation();
	const history = [previous.messages[0], withMessageStatus(previous.messages[1], 'completed')];
	const targetUser = createUserMessage('turn-2', 'Second question', []);
	const target = withMessageStatus(createAssistantMessage('target', { turnId: 'turn-2' }), 'completed');
	target.parts.push({ type: 'text', text: 'Replace this answer' });
	const later = withMessageStatus(createAssistantMessage('later', { turnId: 'turn-3' }), 'completed');
	later.parts.push({ type: 'text', text: 'Later answer' });
	const conversation = {
		...previous,
		messages: [...history, targetUser, target, createUserMessage('turn-3', 'Later question', []), later],
	};
	await stores.conversations.update(previous.id, conversation);
	await stores.runtime.setIn('chat.conversation', conversation);
	const fetch = t.mock.method(globalThis, 'fetch', async () => response());

	await runner.retry(target.id);

	assert.equal(fetch.mock.callCount(), 1);
	const request = JSON.parse(fetch.mock.calls[0].arguments[1]?.body as string);
	assert.deepEqual(
		request.messages.map((message: { role: string }) => message.role),
		['system', 'user', 'assistant', 'user'],
	);
	assert.match(JSON.stringify(request.messages), /Original question|Old partial answer/);
	assert.match(JSON.stringify(request.messages), /Second question/);
	assert.doesNotMatch(JSON.stringify(request.messages), /Replace this answer|Later question|Later answer/);
	const messages = getConversation().messages;
	assert.equal(messages.length, 4);
	assert.deepEqual(messages.slice(0, 3), [...history, targetUser]);
	assert.notEqual(messages[3].id, target.id);
	assert.equal(messages[3].parts.find((part) => part.type === 'text')?.text, 'New answer');
});

test('fork creates and selects an independent conversation through the chosen reply', async () => {
	const { stores, runner, getConversation, getSelectedId } = await setup();
	const previous = getConversation();
	previous.messages[1].metadata.modelId = 'original-model';
	previous.messages[1].metadata.createdAt = 1234;
	previous.messages[1].parts.push(
		{ type: 'reasoning', text: 'Original reasoning', state: 'done' },
		{
			type: 'dynamic-tool',
			toolCallId: 'read-1',
			toolName: 'read',
			state: 'output-available',
			input: {},
			output: 'File content',
		},
	);
	const later = withMessageStatus(createAssistantMessage('later', { turnId: 'turn-2' }), 'completed');
	const conversation = {
		...previous,
		messages: [...previous.messages, createUserMessage('turn-2', 'Later question', []), later],
	};
	await stores.conversations.update(previous.id, conversation);
	await stores.runtime.setIn('chat.conversation', conversation);

	await runner.fork('old-assistant');

	const fork = (await stores.runtime.get()).chat.conversation!;
	assert.notEqual(fork.id, previous.id);
	assert.equal(getSelectedId(), fork.id);
	assert.deepEqual(await stores.conversations.get(fork.id), fork);
	assert.deepEqual(fork.messages, previous.messages);
	assert.equal(getConversation().messages.length, 4);
	assert.deepEqual((await stores.runtime.get()).chat.pendingAttachments, []);
	const attachmentPart = fork.messages[0].parts.find((part) => part.type === 'data-attachments')!;
	attachmentPart.data[0].content = 'Changed in fork';
	assert.equal(
		getConversation().messages[0].parts.find((part) => part.type === 'data-attachments')!.data[0].content,
		'original file snapshot',
	);
});

test('fork preserves navigation that changes while its messages are being saved', async (t) => {
	const { stores, runner, getConversation, getSelectedId } = await setup();
	const destination = { ...getConversation(), id: 'other-conversation' };
	const select = stores.conversations.select.bind(stores.conversations);
	t.mock.method(stores.conversations, 'select', async (id: string | undefined) => {
		await select(id);
		await stores.runtime.setIn('chat.conversation', destination);
	});

	await runner.fork('old-assistant');

	assert.equal(getSelectedId(), destination.id);
	assert.deepEqual((await stores.runtime.get()).chat.conversation, destination);
});
