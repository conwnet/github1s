/**
 * @file function utils
 * @author netcon
 */

import * as jsonStableStringify from 'json-stable-stringify';
import * as pFinally from 'p-finally';

const defaultComputeCacheKey = (...args) => jsonStableStringify([...args]);

// reuse previous promise when a request call
// and previous request not completed
export const reuseable = (func, computeCacheKey = defaultComputeCacheKey) => {
	const cache = new Map<string, Promise<any>>();

	return function (...args: any[]): Promise<any> {
		const key = computeCacheKey(...args);
		if (cache.has(key)) {
			return cache.get(key);
		}

		const promise = func.call(this, ...args);
		cache.set(key, promise);
		return pFinally(promise, () => cache.delete(key));
	};
};

export const throttle = (func: Function, interval: number) => {
	let timer = null;
	return function(...args: any[]): any {
		if (timer) {
			return;
		}
		func.call(this, ...args);
		timer = setTimeout(() => (timer = null), interval);
	};
};
