import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
	{ ignores: ['**/dist', '**/assets', 'vscode-web/lib', '**/vs', '**/vscode.proposed.d.ts'] },
	...tseslint.configs.recommended,
	jsdoc.configs['flat/recommended-typescript'],
	eslintPluginPrettierRecommended,
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
];
