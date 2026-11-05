import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH, parseViewEvent } from '@/common/protocol';

test('view events accept chat commands and context descriptors', () => {
	for (const event of [
		{ type: 'chat.send', text: 'Explain this repository.' },
		{ type: 'chat.cancel' },
		{ type: 'chat.retry', id: 'assistant-1' },
		{ type: 'chat.fork', id: 'assistant-1' },
		{ type: 'chat.setIncludeRecentFiles', enabled: false },
		{ type: 'chat.setIncludeRecentFiles', enabled: true },
		{ type: 'chat.runQuickAction', action: 'repositoryOverview' },
		{
			type: 'chat.addContextAttachment',
			action: 'descriptor',
			descriptor: { id: 'file-1', type: 'file', label: 'index.ts', source: 'github1s://repo/index.ts' },
		},
	]) {
		assert.deepEqual(parseViewEvent(event), event);
	}
});

test('view events reject malformed payloads, unknown actions and unexpected fields', () => {
	for (const event of [
		null,
		{ type: 'unknown' },
		{ type: 'chat.send', text: 123 },
		{ type: 'chat.setIncludeRecentFiles', enabled: 'false' },
		{ type: 'chat.cancel', extra: true },
		{ type: 'history.selectConversation', id: 123 },
		{ type: 'chat.runQuickAction', action: 'unknown' },
		{ type: 'settings.saveModelConfig', config: {} },
		{ type: 'settings.savePromptsConfig', config: { quickActions: { unknown: 'prompt' } } },
	]) {
		assert.equal(parseViewEvent(event), undefined, JSON.stringify(event));
	}
});

test('conversation title updates require an ID and a nonblank title', () => {
	const event = { type: 'history.renameConversation', id: 'conversation-1', title: '  A new title  ' };
	assert.deepEqual(parseViewEvent(event), event);
	for (const invalid of [
		{ ...event, id: '' },
		{ ...event, id: 123 },
		{ ...event, title: '' },
		{ ...event, title: ' \t\n ' },
		{ ...event, title: 123 },
		{ type: event.type, id: event.id },
		{ ...event, extra: true },
	]) {
		assert.equal(parseViewEvent(invalid), undefined, JSON.stringify(invalid));
	}
});

test('highlight requests enforce the source length limit and required fields', () => {
	const request = {
		type: 'markdown.highlight',
		requestId: 'highlight-1',
		languageId: 'typescript',
		source: 'x'.repeat(MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH),
	};
	assert.deepEqual(parseViewEvent(request), request);
	for (const invalid of [
		{ ...request, source: `${request.source}x` },
		{ ...request, source: 123 },
		{ ...request, requestId: '' },
		{ ...request, requestId: 123 },
		{ ...request, languageId: '' },
		{ ...request, languageId: 123 },
		{ ...request, extra: true },
	]) {
		assert.equal(parseViewEvent(invalid), undefined);
	}
});
