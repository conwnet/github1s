/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const vscodeWebRoot = path.dirname(require.resolve('@github1s/vscode-web/package.json'));

const extensionConfig = {
	name: 'extension',
	mode: 'production',
	context: __dirname,
	target: 'webworker',
	entry: './src/extension.ts',
	resolve: {
		extensions: ['.ts', '.js'],
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: {
					loader: 'ts-loader',
					options: {
						configFile: path.join(__dirname, 'tsconfig.extension.json'),
					},
				},
			},
		],
	},
	externals: {
		vscode: 'commonjs vscode',
	},
	output: {
		filename: 'extension.js',
		path: path.join(__dirname, 'dist'),
		libraryTarget: 'commonjs',
		clean: false,
	},
	devtool: false,
	performance: {
		hints: false,
	},
	optimization: {
		// Extend webpack's default JS minimizer with CSS compression.
		minimizer: ['...', new CssMinimizerPlugin()],
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{
					from: path.join(__dirname, 'assets'),
					to: 'assets',
					noErrorOnMissing: true,
				},
				{
					from: path.join(vscodeWebRoot, 'extensions', 'theme-seti', 'icons', 'seti.woff'),
					to: 'assets/seti.woff',
				},
			],
		}),
	],
};

const webviewConfig = {
	name: 'webview',
	mode: 'production',
	context: __dirname,
	target: 'web',
	entry: './src/webview/index.ts',
	resolve: {
		extensions: ['.ts', '.js'],
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: {
					loader: 'ts-loader',
					options: {
						configFile: path.join(__dirname, 'tsconfig.webview.json'),
					},
				},
			},
		],
	},
	output: {
		filename: 'assets/chat.js',
		path: path.join(__dirname, 'dist'),
		clean: false,
	},
	devtool: false,
	performance: {
		hints: false,
	},
};

module.exports = [extensionConfig, webviewConfig];
