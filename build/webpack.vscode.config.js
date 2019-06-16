const os = require('os');
const path = require('path');
const HappyPack = require('happypack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    module: {
        rules: [{
            test: /.(js|ts)$/,
            use: {
                loader: 'string-replace-loader',
                options: {
                    multiple: [{
                        search: 'require.toUrl(letterpress)',
                        replace: 'require.toUrl("./media/letterpress-dark.svg")',
                    }, {
                        search: 'require\\.toUrl\\(',
                        replace: 'location.protocol + "//" + location.host + location.pathname.replace(/\\/$/, "") + "/" + require("!!file-loader?name=[path][name].[ext]!" + ',
                        flags: 'g',
                    }, {
                        search: 'require\\.__\\$__nodeRequire',
                        replace: 'require',
                        flags: 'g',
                    }, {
                        search: '\\.attributes\\[([^\\]]+)\\] = ([^;]+)',
                        replace: '.setAttribute($1, $2)',
                        flags: 'g',
                    }],
                },
            },
        }, {
			test: /\.node$/,
			use: 'node-loader',
        }, {
            test: /(^.?|\.[^d]|[^.]d|[^.][^d])\.tsx?$/,
			use: 'happypack/loader?id=ts',
		}, {
            test: /\.wasm$/,
			type: 'javascript/auto',
        }, {
            test: /\.s?css$/,
            use: [{
				loader: MiniCssExtractPlugin.loader,
			}, {
				loader: 'css-loader',
			}, {
				loader: 'sass-loader',
			}],
        }, {
			test: /\.(png|ttf|woff|eot|woff2)$/,
			use: [{
				loader: 'file-loader',
				options: {
					name: '[path][name].[ext]',
				},
			}],
		}, {
			test: /\.svg$/,
			use: 'url-loader'
		}]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.css'],
        alias: {
            'onigasm-umd': path.join(__dirname, '../node_modules/onigasm-umd/release/main'),
            'vsda': path.join(__dirname, 'empty.ts'),
			'vs': path.join(__dirname, '../lib/vscode/src/vs'),
		},
    },
    resolveLoader: {
		alias: {
			'vs/css': path.join(__dirname, './css.js'),
		},
    },
    plugins: [
        new HappyPack({
			id: 'ts',
			threads: Math.max(os.cpus().length - 1, 1),
			loaders: [{
				path: 'cache-loader',
				query: {
					cacheDirectory: path.join(__dirname, '../.cache'),
				},
			}, {
				path: 'ts-loader',
				query: {
					happyPackMode: true,
					compilerOptions: {
                        'target': 'es5',
                        'lib': ['dom', 'esnext'],
                    },
				},
			}],
        }),
        new MiniCssExtractPlugin({
			chunkFilename: 'styles.[name].[hash:6].css',
			filename: 'styles.[name].[hash:6].css'
		}),
    ],
};
