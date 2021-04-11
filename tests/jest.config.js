module.exports = {
	preset: 'jest-playwright-preset',
	testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/'],
	transform: {
		'^.+\\.(ts)$': 'ts-jest',
	},
	testEnvironmentOptions: {
		'jest-playwright': {
			// launchOptions: {
			// 	headless: false
			// },
			browsers: [
				'chromium',
				// 'firefox', 'webkit'
			],
		},
	},
};
