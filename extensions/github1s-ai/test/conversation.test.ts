import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	createAssistantMessage,
	createUserMessage,
	markStreamingMessagesUnknown,
	validateConversationMessages,
	withMessageStatus,
	type Conversation,
} from '@/common/conversation';
import type { ContextAttachment } from '@/contexts/types';

test('user messages capture attachments and pass conversation validation', async () => {
	const attachment: ContextAttachment = {
		id: 'file-1',
		type: 'file',
		label: 'index.ts',
		source: 'github1s://repo/index.ts',
		content: 'export const answer = 42;',
	};
	const message = createUserMessage('turn-1', 'Explain this file.', [attachment]);
	assert.deepEqual(message, {
		id: 'turn-1',
		role: 'user',
		metadata: { turnId: 'turn-1', status: 'completed' },
		parts: [
			{ type: 'data-attachments', data: [attachment] },
			{ type: 'text', text: 'Explain this file.' },
		],
	});
	attachment.content = 'changed after sending';
	assert.ok(message.parts[0].type === 'data-attachments');
	assert.equal(message.parts[0].data[0].content, 'export const answer = 42;');
	assert.deepEqual(await validateConversationMessages([message]), [message]);
});

test('message status updates preserve content and clear stale errors without mutation', () => {
	const message = createAssistantMessage('assistant-1', 'turn-1');
	message.parts.push({ type: 'text', text: 'Partial answer' });
	const failed = withMessageStatus(message, 'failed', 'Connection lost');
	assert.deepEqual(failed.metadata, { turnId: 'turn-1', status: 'failed', error: 'Connection lost' });
	const completed = withMessageStatus(failed, 'completed');
	assert.deepEqual(completed.metadata, { turnId: 'turn-1', status: 'completed' });
	assert.deepEqual(completed.parts, message.parts);
	assert.equal(message.metadata.status, 'streaming');
	assert.equal(failed.metadata.error, 'Connection lost');
});

test('restoring a conversation marks interrupted streams as unknown', () => {
	const conversation: Conversation = {
		id: 'conversation-1',
		title: 'Test conversation',
		createdAt: 1,
		updatedAt: 1,
		messages: [createUserMessage('turn-1', 'Hello', []), createAssistantMessage('assistant-1', 'turn-1')],
	};
	const restored = markStreamingMessagesUnknown(conversation);
	assert.deepEqual(
		restored.messages.map(({ metadata }) => metadata.status),
		['completed', 'unknown'],
	);
	assert.deepEqual(restored.messages[0], conversation.messages[0]);
	assert.equal(conversation.messages[1].metadata.status, 'streaming');
	assert.deepEqual(markStreamingMessagesUnknown(restored), restored);
});

test('conversation validation rejects corrupt metadata and attachments', async () => {
	const message = createUserMessage('turn-1', 'Hello', []);
	await assert.rejects(
		validateConversationMessages([{ ...message, metadata: { turnId: 'turn-1', status: 'invalid' } }]),
		/Invalid conversation message metadata/,
	);
	await assert.rejects(
		validateConversationMessages([{ ...message, parts: [{ type: 'data-attachments', data: [{ id: 'file-1' }] }] }]),
		/Invalid context attachments/,
	);
});
