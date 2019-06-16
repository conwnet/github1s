const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = merge(require('./build/webpack.vscode.config'), {
    entry: path.join(__dirname, 'src/index.js'),
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].[chunkhash:8].chunk.js',
        publicPath: '/',
    },
    devtool: isProduction ? 'none' : 'cheap-module-eval-source-map',
    mode: isProduction ? 'production' : 'development',
    devServer: {
        port: 3000,
    },
    plugins: [
        new webpack.ProgressPlugin(),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'src/404.html'),
            filename: '404.html',
        }),
    ],
});
