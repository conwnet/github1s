/**
 * @file common util
 * @author netcon
 */

export const noop = () => {};
export const isNil = (value: any) => value === undefined || value === null;

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
	const validSegments = segments.filter(Boolean);
	if (!validSegments.length) {
		return '';
	}
	return validSegments.reduce((prev, segment) => {
		return trimEnd(prev, '/') + '/' + trimStart(segment, '/');
	});
};

export const dirname = (path: string): string => {
	const trimmedPath = trimEnd(path, '/');
	return trimmedPath.substr(0, trimmedPath.lastIndexOf('/')) || '';
};

export const basename = (path: string): string => {
	const trimmedPath = trimEnd(path, '/');
	return trimmedPath.substr(trimmedPath.lastIndexOf('/') + 1) || '';
};

export const uniqueId = (
	(id) => () =>
		id++
)(1);

export const prop = (obj: object, path: (string | number)[] = []): any => {
	let cur = obj;
	path.forEach((key) => (cur = cur ? cur[key] : undefined));
	return cur;
};

export const last = <T>(array: readonly T[]): T => {
	return array[array.length - 1];
};

export const encodeFilePath = (filePath: string): string => {
	return filePath
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');
};
