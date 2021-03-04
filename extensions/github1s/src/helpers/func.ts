/**
 * @file function utils
 * @author netcon
 */

import * as jsonStableStringify from 'json-stable-stringify';
import * as pFinally from 'p-finally';

const defaultComputeCacheKey = (...args) => jsonStableStringify([...args]);

// reuse previous promise when a request call
// and previous request not completed
export const reuseable = <T extends (...args: any[]) => Promise<any>>(
	func: T,
	computeCacheKey: (...args: Parameters<T>) => string = defaultComputeCacheKey
) => {
	const cache = new Map<string, ReturnType<T>>();

	return function (...args: Parameters<T>): ReturnType<T> {
		const key = computeCacheKey(...args);
		if (cache.has(key)) {
			return cache.get(key);
		}

		const promise = func.call(this, ...args);
		cache.set(key, promise);
		return pFinally(promise, () => cache.delete(key));
	};
};

export const throttle = <T extends (...args: any[]) => any>(
	func: T,
	interval: number
) => {
	let timer = null;
	return function (...args: Parameters<T>): ReturnType<T> {
		if (timer) {
			return;
		}
		func.call(this, ...args);
		timer = setTimeout(() => (timer = null), interval);
	};
};
