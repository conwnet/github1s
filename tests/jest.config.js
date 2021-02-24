module.exports = {
	preset: 'jest-playwright-preset',
	testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/'],
	transform: {
		'^.+\\.(ts)$': 'ts-jest',
	},
	testEnvironmentOptions: {
		'jest-playwright': {
			browsers: ['chromium', 'firefox', 'webkit'],
		},
	},
};
