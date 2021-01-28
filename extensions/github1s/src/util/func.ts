/**
 * @file function utils
 * @author netcon
 */

import * as hash from 'object-hash/dist/object_hash';
import * as pFinally from 'p-finally';

// TODO: implement real lru
export const lruCache = (func) => {
  const cache = new Map<string, Promise<any>>();

	return function (...args) {
    const key = hash(args);
    if (cache.has(key)) {
      return cache.get(key);
    }

		const promise = func.call(this, ...args);
    cache.set(key, promise);
    return pFinally(promise, () => {
      cache.delete(key);
    });
	};
};
