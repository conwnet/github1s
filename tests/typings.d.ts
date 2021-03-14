import 'jest';

declare global {
	namespace jest {
		interface Matchers<R> {
			toMatchImageSnapshot(): R;
		}
	}
}
