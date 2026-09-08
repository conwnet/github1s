import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH, parseMarkdownHighlightRequest, parseViewEvent } from '@/common/protocol';

test('view events accept chat commands and context descriptors', () => {
	for (const event of [
		{ type: 'chat.send', text: 'Explain this repository.' },
		{ type: 'chat.cancel' },
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
		{ type: 'chat.cancel', extra: true },
		{ type: 'history.selectConversation', id: 123 },
		{ type: 'chat.runQuickAction', action: 'unknown' },
		{ type: 'settings.saveModelConfig', config: {} },
		{ type: 'settings.savePromptsConfig', config: { quickActions: { unknown: 'prompt' } } },
	]) {
		assert.equal(parseViewEvent(event), undefined, JSON.stringify(event));
	}
});

test('highlight requests enforce the source length limit and required fields', () => {
	const request = {
		type: 'markdown.highlight',
		requestId: 'highlight-1',
		languageId: 'typescript',
		source: 'x'.repeat(MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH),
	};
	assert.deepEqual(parseMarkdownHighlightRequest(request), request);
	assert.equal(parseMarkdownHighlightRequest({ ...request, source: `${request.source}x` }), undefined);
	assert.equal(parseMarkdownHighlightRequest({ ...request, requestId: '' }), undefined);
	assert.equal(parseMarkdownHighlightRequest({ ...request, extra: true }), undefined);
});
