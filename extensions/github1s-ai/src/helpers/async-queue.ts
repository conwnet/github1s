export const createAsyncQueue = () => {
	let pending: Promise<unknown> = Promise.resolve();
	return <T>(operation: () => Promise<T>): Promise<T> => {
		const result = pending.then(operation, operation);
		pending = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	};
};
