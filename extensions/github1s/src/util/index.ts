/**
 * @file common util
 * @author netcon
 */

export { fetch } from './fetch';
export { lruCache } from './func';

export const noop = () => {};

export const trimStart = (str: string, chars: string = ' '): string => {
  let index = 0;

  while (chars.indexOf(str[index]) !== -1) {
      index++;
  }
  return str.slice(index);
};

export const trimEnd = (str: string, chars: string = ' '): string => {
  let length = str.length;

  while (length && chars.indexOf(str[length - 1]) !== -1) {
      length--;
  }
  return str.slice(0, length);
};

export const joinPath = (...segments: string[]): string => {
  if (!segments.length) {
      return '';
  }

  return segments.reduce((prev, segment) => {
      return trimEnd(prev, '/') + '/' + trimStart(segment, '/');
  });
};

export const dirname = (path: string): string => {
		const trimmedPath = trimEnd(path, '/');

		return trimmedPath.substr(0, trimmedPath.lastIndexOf('/')) || '';
}

export const uniqueId = (id => () => id++)(1);

export const prop = (obj: object, path: (string | number)[] = []): any => {
  let cur = obj;
  path.forEach(key => (cur = (cur ? cur[key] : undefined)));
  return cur;
};
