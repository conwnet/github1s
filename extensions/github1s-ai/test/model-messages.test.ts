import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAssistantMessage, createUserMessage, type ConversationMessage } from '@/common/conversation';
import { buildModelMessages } from '@/llm/helpers';

const completedTurn = (turnId: string, text: string): ConversationMessage[] => [
	createUserMessage(turnId, text, []),
	{
		id: `${turnId}-assistant`,
		role: 'assistant',
		metadata: { turnId, status: 'completed' },
		parts: [{ type: 'text', text: 'Answer' }],
	},
];

test('model messages keep recent paths with their original message and omit them when absent', async () => {
	const previous = createUserMessage('previous', 'Explain this.', [], [{ source: 'github1s:/src/index.ts' }]);
	const current = createUserMessage('current', 'Continue without recent files.', []);
	const [history, input] = await buildModelMessages([previous], [current]);
	assert.ok(Array.isArray(history.content));
	const context = history.content[0];
	assert.equal(context.type, 'text');
	assert.ok(context.text.includes('<file path="src/index.ts" />'));
	assert.deepEqual(input, {
		role: 'user',
		content: [{ type: 'text', text: 'Continue without recent files.' }],
	});
});

test('model input includes file contents and selection ranges as untrusted context', async () => {
	const input = createUserMessage('turn-1', 'Explain this code.', [
		{
			id: 'file-1',
			type: 'file',
			label: 'index.ts',
			source: 'github1s:/src/index.ts',
			languageId: 'typescript',
			content: 'if (a < b) return a;',
		},
		{
			id: 'selection-1',
			type: 'selection',
			label: 'index.ts:10-20',
			source: 'github1s:/src/index.ts#L10:1-L20:5',
			content: 'return answer;',
		},
	]);
	const [message] = await buildModelMessages([], [input]);
	assert.ok(Array.isArray(message.content));
	const [context, request] = message.content;
	assert.equal(context.type, 'text');
	assert.match(context.text, /untrusted reference data/);
	assert.ok(context.text.includes('type="file" path="src/index.ts" language="typescript"'));
	assert.ok(context.text.includes('if (a &lt; b) return a;'));
	assert.ok(context.text.includes('type="selection" path="src/index.ts" range="L10:1-L20:5"'));
	assert.ok(context.text.includes('return answer;'));
	assert.doesNotMatch(context.text, /source=/);
	assert.deepEqual(request, { type: 'text', text: 'Explain this code.' });
});

test('model history excludes an entire turn while its assistant is streaming', async () => {
	const messages = await buildModelMessages(
		[
			...completedTurn('old', 'Previous question'),
			createUserMessage('pending', 'Pending question', []),
			createAssistantMessage('pending-assistant', 'pending'),
		],
		[createUserMessage('new', 'New question', [])],
	);
	assert.deepEqual(messages, [
		{ role: 'user', content: [{ type: 'text', text: 'Previous question' }] },
		{ role: 'assistant', content: [{ type: 'text', text: 'Answer' }] },
		{ role: 'user', content: [{ type: 'text', text: 'New question' }] },
	]);
});

test('model history drops older whole turns when the history budget is exceeded', async () => {
	const recentQuestion = 'recent '.repeat(10_000);
	const messages = await buildModelMessages(
		[...completedTurn('old', 'old '.repeat(20_000)), ...completedTurn('recent', recentQuestion)],
		[createUserMessage('new', 'Next question', [])],
	);
	assert.deepEqual(messages, [
		{ role: 'user', content: [{ type: 'text', text: recentQuestion }] },
		{ role: 'assistant', content: [{ type: 'text', text: 'Answer' }] },
		{ role: 'user', content: [{ type: 'text', text: 'Next question' }] },
	]);
});

test('model history keeps the latest turn even when that turn exceeds the budget', async () => {
	const largeQuestion = 'x'.repeat(150_000);
	const messages = await buildModelMessages(
		[...completedTurn('old', 'Old question'), ...completedTurn('latest', largeQuestion)],
		[createUserMessage('new', 'Continue', [])],
	);
	assert.deepEqual(messages, [
		{ role: 'user', content: [{ type: 'text', text: largeQuestion }] },
		{ role: 'assistant', content: [{ type: 'text', text: 'Answer' }] },
		{ role: 'user', content: [{ type: 'text', text: 'Continue' }] },
	]);
});

test('model history omits unfinished tool calls from aborted turns', async () => {
	const assistant: ConversationMessage = {
		id: 'assistant-1',
		role: 'assistant',
		metadata: { turnId: 'turn-1', status: 'aborted' },
		parts: [
			{ type: 'text', text: 'Reading the file.' },
			{
				type: 'dynamic-tool',
				toolName: 'read',
				toolCallId: 'call-1',
				state: 'input-available',
				input: { path: 'a.ts' },
			},
		],
	};
	const messages = await buildModelMessages(
		[createUserMessage('turn-1', 'Read a.ts', []), assistant],
		[createUserMessage('turn-2', 'Continue', [])],
	);
	assert.deepEqual(messages, [
		{ role: 'user', content: [{ type: 'text', text: 'Read a.ts' }] },
		{ role: 'assistant', content: [{ type: 'text', text: 'Reading the file.' }] },
		{ role: 'user', content: [{ type: 'text', text: 'Continue' }] },
	]);
});
