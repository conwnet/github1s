(function () {
	const staticAssetsPath = '/static' + (window.staticHashCode ? '/' + window.staticHashCode : '');
	const staticAssetsPrefix = window.location.origin + staticAssetsPath;
	const nodeModulesPrefix = staticAssetsPrefix + '/node_modules';

	// config vscode loader
	if (window.require && window.require.config) {
		window.require.config({
			baseUrl: staticAssetsPrefix + '/vscode',
			recordStats: true,
			trustedTypesPolicy: window.trustedTypes
				? window.trustedTypes.createPolicy('amdLoader', {
						createScriptURL(value) {
							if (value.startsWith(staticAssetsPrefix)) {
								return value;
							}
							throw new Error(`Invalid script url: ${value}`);
						},
				  })
				: undefined,
			paths: {
				'@vscode/iconv-lite-umd': nodeModulesPrefix + '/@vscode/iconv-lite-umd/lib/iconv-lite-umd.js',
				'@vscode/vscode-languagedetection': nodeModulesPrefix + '/@vscode/vscode-languagedetection/dist/lib/index.js',
				jschardet: nodeModulesPrefix + '/jschardet/dist/jschardet.min.js',
				'tas-client-umd': nodeModulesPrefix + '/tas-client-umd/lib/tas-client-umd.js',
				'vscode-oniguruma': nodeModulesPrefix + '/vscode-oniguruma/release/main.js',
				'vscode-textmate': nodeModulesPrefix + '/vscode-textmate/release/main.js',
				xterm: nodeModulesPrefix + '/xterm/lib/xterm.js',
				'xterm-addon-search': nodeModulesPrefix + '/xterm-addon-search/lib/xterm-addon-search.js',
				'xterm-addon-unicode11': nodeModulesPrefix + '/xterm-addon-unicode11/lib/xterm-addon-unicode11.js',
				'xterm-addon-webgl': nodeModulesPrefix + '/xterm-addon-webgl/lib/xterm-addon-webgl.js',
			},
		});
	}

	// set product.json
	const productJson = {
		nameShort: 'GitHub1s',
		nameLong: 'GitHub1s',
		applicationName: 'github1s',
		dataFolderName: '.github1s',
		win32MutexName: 'github1s',
		licenseName: 'MIT',
		licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
		reportIssueUrl: 'https://github.com/conwnet/github1s/issues/new',
		extensionsGallery: {
			serviceUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery',
			cacheUrl: 'https://vscode.blob.core.windows.net/gallery/index',
			itemUrl: 'https://marketplace.visualstudio.com/items',
			resourceUrlTemplate: window.location.origin + '/api/vscode-unpkg/{publisher}/{name}/{version}/{path}',
			controlUrl: 'https://az764295.vo.msecnd.net/extensions/marketplace.json',
			recommendationsUrl: 'https://az764295.vo.msecnd.net/extensions/workspaceRecommendations.json.gz',
		},
		linkProtectionTrustedDomains: [
			'*.github.com',
			'*.microsoft.com',
			'*.github1s.com',
			'*.vercel.com',
			'*.sourcegraph.com',
			'*.gitpod.io',
		],
	};

	// set workbench config
	const hostname = window.location.hostname;
	let scheme = 'github1s';
	let logoTitle = 'Open on GitHub';
	let targetOrigin = 'https://github.com';
	let logoIcon = staticAssetsPrefix + '/config/github.svg';

	if (hostname.match(/\.?(github1s\.com|github1s\.dev|vercel\.app|localhost)$/i)) {
		scheme = 'github1s';
		logoTitle = 'Open on GitHub';
		targetOrigin = 'https://github.com';
		logoIcon = staticAssetsPrefix + '/config/github.svg';
	} else if (hostname.match(/\.?gitlab1s\.com$/i)) {
		scheme = 'gitlab1s';
		logoTitle = 'Open on GitLub';
		targetOrigin = 'https://gitlab.com';
		logoIcon = staticAssetsPrefix + '/config/gitlab.svg';
	} else if (hostname.match(/\.?bitbucket1s\.org$/)) {
		scheme = 'bitbucket1s';
		logoTitle = 'Open on Bitbucket';
		targetOrigin = 'https://bitbucket1s.com';
		logoIcon = staticAssetsPrefix + '/config/bitbucket.svg';
	}

	let repository = 'conwnet/github1s';
	if (hostname.match(/\.?(github1s\.com|github1s\.dev|gitlab1s\.com|bitbucket1s\.org|vercel\.app|localhost)$/i)) {
		const pathParts = window.location.pathname.split('/').filter(Boolean).slice(0, 2);
		pathParts.length === 2 && (repository = pathParts.join('/'));
	}

	window.vscodeWeb = {
		additionalBuiltinExtensions: [],
		windowIndicator: { label: repository },
		webviewEndpoint: staticAssetsPrefix + '/vscode/vs/workbench/contrib/webview/browser/pre',
		webWorkerExtensionHostIframeSrc:
			staticAssetsPrefix + '/vscode/vs/workbench/services/extensions/worker/httpWebWorkerExtensionHostIframe.html',
		commands: [
			{
				id: 'github1s.commands.vscode.getBrowserUrl',
				handler() {
					return window.location.href;
				},
			},
			{
				id: 'github1s.commands.vscode.replaceBrowserUrl',
				handler(url) {
					window.history.replaceState(null, '', url);
				},
			},
			{
				id: 'github1s.commands.vscode.pushBrowserUrl',
				handler(url) {
					window.history.pushState(null, '', url);
				},
			},
		],
		product: productJson,
		builtinExtensions: window.github1sExtensions || [],
		folderUri: { scheme: scheme, authority: '', path: '/' },
		workspaceId: `${scheme}:${repository}`,
		workspaceLabel: repository,
		hideTextFileReadonlyIcon: false,
		logo: {
			icon: logoIcon,
			title: logoTitle,
			onClick() {
				const targetPath = window.location.pathname + window.location.search + window.location.hash;
				window.open(targetOrigin + targetPath, '_blank');
			},
		},
		onWorkbenchReady() {
			const loadSpinner = document.querySelector('#load-spinner');
			loadSpinner && loadSpinner.remove();
		},
	};
})();
