import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shouldSubmitComposer } from '@/webview/helpers/composer';

test('Enter submits except when inserting a newline or composing IME input', () => {
	const enter = { key: 'Enter', shiftKey: false, altKey: false, isComposing: false };
	assert.equal(shouldSubmitComposer(enter), true);
	for (const event of [
		{ ...enter, shiftKey: true },
		{ ...enter, altKey: true },
		{ ...enter, isComposing: true },
		{ ...enter, key: 'Escape' },
	]) {
		assert.equal(shouldSubmitComposer(event), false);
	}
});
