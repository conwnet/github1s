const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.config.js');
const proxyServer = require('./scripts/serve-dist');

const compiler = Webpack(webpackConfig);
const devServerOptions = { ...webpackConfig.devServer, open: true };
const server = new WebpackDevServer(devServerOptions, compiler);

const runServer = async () => {
	console.log('Starting server...');
	await server.start();
};

runServer();

proxyServer.listen(5001, () => {
	console.log('Proxy server is running at http://localhost:5001');
});
