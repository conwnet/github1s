import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAsyncQueue } from '@/helpers/async-queue';

test('queued operations run serially and return their own results', async () => {
	const enqueue = createAsyncQueue();
	const events: string[] = [];
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const first = enqueue(async () => {
		events.push('first:start');
		await gate;
		events.push('first:end');
		return 1;
	});
	const second = enqueue(async () => {
		events.push('second');
		return 2;
	});
	await Promise.resolve();
	assert.deepEqual(events, ['first:start']);
	release();
	assert.deepEqual(await Promise.all([first, second]), [1, 2]);
	assert.deepEqual(events, ['first:start', 'first:end', 'second']);
});

test('a rejected operation does not block later queued work', async () => {
	const enqueue = createAsyncQueue();
	const failed = enqueue(async () => {
		throw new Error('Save failed');
	});
	const next = enqueue(async () => 'saved');
	await assert.rejects(failed, /Save failed/);
	assert.equal(await next, 'saved');
});
