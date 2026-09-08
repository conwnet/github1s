import { cloneDeep, set } from 'lodash-es';

import type { RuntimeState } from '@/common/state';

type StatePath<T> = T extends object
	? {
			[Key in Extract<keyof T, string>]:
				| Key
				| (NonNullable<T[Key]> extends readonly unknown[]
						? never
						: NonNullable<T[Key]> extends object
							? `${Key}.${StatePath<NonNullable<T[Key]>>}`
							: never);
		}[Extract<keyof T, string>]
	: never;

type StatePathValue<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
	? Key extends keyof T
		? StatePathValue<NonNullable<T[Key]>, Rest>
		: never
	: Path extends keyof T
		? T[Path]
		: never;

export interface StateStore<T> {
	get(): Promise<T>;
	set(item: T): Promise<void>;
	setIn<Path extends StatePath<T>>(path: Path, value: StatePathValue<T, Path>): Promise<void>;
	clear(): Promise<void>;
}

const DEFAULT_RUNTIME_STATE: RuntimeState = {
	page: 'chat',
	chat: {},
	history: {},
	settings: {},
};

export const createRuntimeStateStore = (): StateStore<RuntimeState> => {
	let state = DEFAULT_RUNTIME_STATE;
	return {
		get: async () => state,
		set: async (item) => {
			state = item;
		},
		setIn: async (path, value) => {
			state = set(cloneDeep(state), path, value);
		},
		clear: async () => {
			state = DEFAULT_RUNTIME_STATE;
		},
	};
};
