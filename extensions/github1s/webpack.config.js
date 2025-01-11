/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

//@ts-check
/** WebpackConfig */
/* eslint-disable @typescript-eslint/no-require-imports */
const webpack = require('webpack');
const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
	context: __dirname,
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
	target: 'webworker', // extensions run in a webworker context
	entry: {
		extension: './src/extension.ts',
	},
	resolve: {
		mainFields: ['module', 'main'],
		extensions: ['.ts', '.js'], // support ts-files and js-files
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						// configure TypeScript loader:
						// * enable sources maps for end-to-end source maps
						loader: 'ts-loader',
						options: {
							compilerOptions: {
								sourceMap: true,
								declaration: false,
								experimentalDecorators: true,
							},
						},
					},
				],
			},
		],
	},
	externals: {
		vscode: 'commonjs vscode', // ignored because it doesn't exist
	},
	performance: {
		hints: false,
	},
	output: {
		filename: 'extension.js',
		path: path.join(__dirname, 'dist'),
		libraryTarget: 'commonjs',
	},
	devtool: 'source-map',
	plugins: [
		new webpack.DefinePlugin({
			GITHUB_ORIGIN: JSON.stringify(process.env.GITHUB_DOMAIN || 'https://github.com'),
			GITHUB_API_PREFIX: JSON.stringify(process.env.GITHUB_API_PREFIX || 'https://api.github.com'),
			GITLAB_ORIGIN: JSON.stringify(process.env.GITLAB_DOMAIN || 'https://gitlab.com'),
			GITLAB_API_PREFIX: JSON.stringify(process.env.GITLAB_API_PREFIX || 'https://gitlab.com/api/v4'),
		}),
		new webpack.ProvidePlugin({
			process: 'process/browser.js',
		}),
		new NodePolyfillPlugin(),
	],
};
