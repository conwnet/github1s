/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
"use strict";

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

import { join } from "path";

export const context = __dirname;
export const mode = "none";
export const target = "webworker";
export const entry = {
	extension: "./src/extension.js",
};
export const resolve = {
	// node: { fs: 'empty', child_process: 'empty', net: 'empty', tls: 'empty' },
	fallback: {
		fs: false,
		child_process: false,
		net: false,
		tls: false,
		stream: false,
		assert: false,
		url: false,
		buffer: false,
		querystring: false,
		zlib: false,
		os: false,
		crypto: require.resolve("crypto-browserify"),
	},
	mainFields: ["module", "main"],
	extensions: [".ts", ".js"],
	alias: {
		https: "https-browserify",
		http: "http-browserify",
	},
};
export const module = {
	rules: [
		{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [
				{
					// configure TypeScript loader:
					// * enable sources maps for end-to-end source maps
					loader: "ts-loader",
					options: {
						compilerOptions: {
							sourceMap: true,
							declaration: false,
						},
					},
				},
			],
		},
	],
};
export const externals = {
	vscode: "commonjs vscode", // ignored because it doesn't exist
};
export const performance = {
	hints: false,
};
export const output = {
	filename: "extension.js",
	path: join(__dirname, "dist"),
	libraryTarget: "commonjs",
};
export const devtool = "source-map";
