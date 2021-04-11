// This must be ran from VS Code's root.
const gulp = require('gulp');
const _ = require('underscore');
const buildfile = require('./src/buildfile');
const common = require('./build/lib/optimize');
const util = require('./build/lib/util');

const vscodeEntryPoints = _.flatten([
	buildfile.entrypoint('vs/workbench/workbench.web.api'),
	buildfile.base,
	buildfile.workbenchWeb,
	buildfile.workerExtensionHost,
	buildfile.workerNotebook,
	buildfile.keyboardMaps,
	buildfile.entrypoint('vs/platform/files/node/watcher/unix/watcherApp'),
	buildfile.entrypoint('vs/platform/files/node/watcher/nsfw/watcherApp'),
	buildfile.entrypoint(
		'vs/workbench/services/extensions/node/extensionHostProcess'
	),
]);

const vscodeResources = [
	'!out-build/vs/server/doc/**',
	'out-build/vs/workbench/services/extensions/worker/extensionHostWorkerMain.js',
	'out-build/bootstrap.js',
	'out-build/bootstrap-fork.js',
	'out-build/bootstrap-amd.js',
	'out-build/bootstrap-node.js',
	'out-build/paths.js',
	'out-build/vs/**/*.{svg,png,html,ttf}',
	'!out-build/vs/code/browser/workbench/*.html',
	'!out-build/vs/code/electron-browser/**',
	'out-build/vs/base/common/performance.js',
	'out-build/vs/base/node/languagePacks.js',
	'out-build/vs/base/browser/ui/codicons/codicon/**',
	'out-build/vs/workbench/browser/media/*-theme.css',
	'out-build/vs/workbench/contrib/debug/**/*.json',
	'out-build/vs/workbench/contrib/externalTerminal/**/*.scpt',
	'out-build/vs/workbench/contrib/webview/browser/pre/*.js',
	'out-build/vs/**/markdown.css',
	'out-build/vs/workbench/contrib/tasks/**/*.json',
	'out-build/vs/platform/files/**/*.md',
	'!**/test/**',
];

gulp.task(
	'optimize',
	gulp.series(
		util.rimraf('out-vscode'),
		common.optimizeTask({
			src: 'out-build',
			entryPoints: vscodeEntryPoints,
			resources: vscodeResources,
			loaderConfig: common.loaderConfig(),
			out: 'out-vscode',
			inlineAmdImages: true,
			bundleInfo: undefined,
		})
	)
);

gulp.task(
	'minify',
	gulp.series(util.rimraf('out-vscode-min'), common.minifyTask('out-vscode'))
);
