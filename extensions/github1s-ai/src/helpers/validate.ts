export const exactString = (value: Record<string, unknown>, key: string): boolean =>
	hasExactKeys(value, ['type', key]) && typeof value[key] === 'string';

export const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
	Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
