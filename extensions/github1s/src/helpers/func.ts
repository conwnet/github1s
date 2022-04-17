/**
 * @file function utils
 * @author netcon
 */

import * as jsonStableStringify from 'json-stable-stringify';
import pFinally from 'p-finally';

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
			return cache.get(key)!;
		}

		const promise = func.call(this, ...args);
		cache.set(key, promise);
		return pFinally(promise, () => cache.delete(key));
	};
};

export const throttle = <T extends (...args: any[]) => any>(func: T, interval: number) => {
	let timer: ReturnType<typeof setTimeout> | null = null;
	return function (...args: Parameters<T>): ReturnType<T> | undefined {
		if (timer) {
			return;
		}
		func.call(this, ...args);
		timer = setTimeout(() => (timer = null), interval);
	};
};

export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
	let timer: ReturnType<typeof setTimeout> | null = null;
	return function (...args: Parameters<T>): void {
		timer && clearTimeout(timer);
		timer = setTimeout(() => func.call(this, ...args), wait);
	};
};

// debounce an async func. once an async func canceled, it throws a exception
export const debounceAsyncFunc = <T extends (...args: any[]) => Promise<any>>(func: T, wait: number) => {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let previousReject: (() => any) | null = null;
	return function (...args: Parameters<T>): ReturnType<T> {
		return new Promise((resolve, reject) => {
			timer && clearTimeout(timer);
			previousReject && previousReject();
			timer = setTimeout(() => resolve(func.call(this, ...args)), wait);
			previousReject = reject;
		}) as ReturnType<T>;
	};
};
