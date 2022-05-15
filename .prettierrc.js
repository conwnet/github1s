module.exports = {
	tabWidth: 2,
	useTabs: true,
	semi: true,
	singleQuote: true,
	printWidth: 120,
	overrides: [
		{
			files: ['*.yml', '*.yaml', '*.json'],
			options: {
				useTabs: false,
			},
		},
	],
};
