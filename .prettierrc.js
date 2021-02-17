module.exports = {
	tabWidth: 2,
	useTabs: true,
	semi: true,
	singleQuote: true,
	overrides: [
		{
			files: ['*.yml', '*.yaml', '*.json'],
			options: {
				useTabs: false,
			},
		},
	],
};
