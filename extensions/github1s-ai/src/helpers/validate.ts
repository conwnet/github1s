export const exactString = <Key extends string>(
	value: Record<string, unknown>,
	key: Key,
): value is Record<string, unknown> & Record<Key, string> =>
	hasExactKeys(value, ['type', key]) && typeof value[key] === 'string';

export const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
	Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

export const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export const isNonBlankString = (value: unknown): value is string => isNonEmptyString(value) && value.trim().length > 0;
