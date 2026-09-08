import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatToolOutput, MAX_TOOL_OUTPUT_CHARACTERS } from '@/tools/output';

test('tool output preserves complete results without an unnecessary footer', () => {
	assert.equal(
		formatToolOutput(['first', 'second'], () => ''),
		'first\nsecond',
	);
	assert.equal(
		formatToolOutput([], () => ''),
		'',
	);
});

test('tool output truncates at whole lines and reserves space for the footer', () => {
	const footer = '1 more result';
	const first = 'x'.repeat(MAX_TOOL_OUTPUT_CHARACTERS - footer.length - 1);
	const output = formatToolOutput([first, 'second'], (included) => `${2 - included} more result`);
	assert.equal(output, `${first}\n${footer}`);
	assert.equal(output.length, MAX_TOOL_OUTPUT_CHARACTERS);
	assert.equal(
		formatToolOutput(['x'.repeat(MAX_TOOL_OUTPUT_CHARACTERS + 1)], () => '1 omitted'),
		'1 omitted',
	);
});
