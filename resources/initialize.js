(function () {
	/*** begin config block ***/
	const staticAssetsPath = '/static' + (window.staticHashCode ? '/' + window.staticHashCode : '');
	const staticAssetsPrefix = window.location.origin + staticAssetsPath;
	const nodeModulesPrefix = staticAssetsPrefix + '/node_modules';

	// config vscode loader
	if (window.require && window.require.config) {
		window.require.config({
			baseUrl: staticAssetsPrefix + '/vscode',
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

	// set workbench config
	const hostname = window.location.hostname;
	let scheme = 'github1s';
	let platformName = 'GitHub';
	let platformOrigin = 'https://github.com';
	let logoIcon = staticAssetsPrefix + '/config/github.svg';

	if (hostname.match(/\.?(github1s\.com|github1s\.dev|vercel\.app)$/i)) {
		scheme = 'github1s';
		platformName = 'GitHub';
		platformOrigin = 'https://github.com';
		logoIcon = staticAssetsPrefix + '/config/github.svg';
	} else if (hostname.match(/\.?gitlab1s\.com$/i)) {
		scheme = 'gitlab1s';
		platformName = 'GitLab';
		platformOrigin = 'https://gitlab.com';
		logoIcon = staticAssetsPrefix + '/config/gitlab.svg';
	} else if (hostname.match(/\.?bitbucket1s\.org$/)) {
		scheme = 'bitbucket1s';
		platformName = 'Bitbucket';
		platformOrigin = 'https://bitbucket1s.com';
		logoIcon = staticAssetsPrefix + '/config/bitbucket.svg';
	}

	let repository = 'conwnet/github1s';
	if (hostname.match(/\.?(github1s\.com|github1s\.dev|gitlab1s\.com|bitbucket1s\.org|vercel\.app|localhost)$/i)) {
		const pathParts = window.location.pathname.split('/').filter(Boolean).slice(0, 2);
		pathParts.length === 2 && (repository = pathParts.join('/'));
	}

	// set product.json
	const productJson = {
		nameShort: platformName + '1s',
		nameLong: platformName + '1s',
		applicationName: platformName + '1s',
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
			'*.github1s.com',
			'*.gitlab.com',
			'*.gitlab1s.com',
			'*.bitbucket.org',
			'*.bitbucket1s.org',
			'*.microsoft.com',
			'*.vercel.com',
			'*.sourcegraph.com',
			'*.gitpod.io',
		],
	};
	/*** end config block ***/

	/*** begin connect to github block ***/
	// resolves with `{ access_token: string; token_type?: string; scope?: string } | { error: string; error_description: string; }`
	const ConnectToGitHub = () => {
		const GITHUB_AUTH_URL =
			'https://github.com/login/oauth/authorize?scope=repo,user:email&client_id=eae6621348403ea49103';
		const OPEN_WINDOW_FEATURES =
			'directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=800,height=520,top=150,left=150';
		const AUTH_PAGE_ORIGIN = 'https://auth.github1s.com';
		const opener = window.open(GITHUB_AUTH_URL, '_blank', OPEN_WINDOW_FEATURES);
		const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

		return new Promise((resolve) => {
			const handleAuthMessage = (event) => {
				// Note that though the browser block opening window and popup a tip,
				// the user can be still open it from the tip. In this case, the `opener`
				// is null, and we should still process the authorizing message
				const isValidOpener = !!(opener && event.source === opener);
				const isValidOrigin = event.origin === AUTH_PAGE_ORIGIN;
				const isValidResponse = event.data ? event.data.type === 'authorizing' : false;
				if (!isValidOpener || !isValidOrigin || !isValidResponse) {
					return;
				}
				window.removeEventListener('message', handleAuthMessage);
				resolve(event.data.payload);
			};

			window.addEventListener('message', handleAuthMessage);
			// if there isn't any message from opener window in 300s, remove the message handler
			timeout(300 * 1000).then(() => {
				window.removeEventListener('message', handleAuthMessage);
				resolve({ error: 'authorizing_timeout', error_description: 'Authorizing timeout' });
			});
		});
	};
	/*** end connect to github block ***/

	/*** begin notificaton block ***/
	const renderNotification = () => {
		const NOTIFICATION_STORAGE_KEY = 'GITHUB1S_NOTIFICATION';
		// Change this if a new notification should be shown
		const NOTIFICATION_STORAGE_VALUE = '202102123';
		// If user has confirmed the notification and checked `don't show me again`, ignore it
		if (window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) === NOTIFICATION_STORAGE_VALUE) {
			return;
		}

		// prettier-ignore
		const notifications = [{
			title: 'ATTENTION: This page is NOT officially provided by ' + platformName + '.',
			content: platformName + '1s is an open source project, which is not officially provided by ' + platformName + '.',
			link: 'https://github.com/conwnet/github1s',
		}];

		const notificationStylesText =
			'.github1s-notification{display:block;position:fixed;left:0;right:0;bottom:0;height:60px;' +
			'z-index:999;display:flex;box-shadow:1px 1px 5px 3px #1e1e1e;background:rgba(0,0,0,.8);font-size:14px}' +
			'.github1s-notification .notification-main{flex:1;padding:0 20px;display:flex;flex-direction:column;' +
			'justify-content:center;overflow:hidden}.github1s-notification .notification-main .notification-title{' +
			'color:#ffe58f;font-size:16px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}' +
			'.github1s-notification .notification-main .notification-content{color:#ccc;font-size:13px;overflow:hidden;' +
			'white-space:nowrap;text-overflow:ellipsis}.github1s-notification .notification-main .notification-link{' +
			'color:#3794ff;text-decoration:none}.github1s-notification .notification-main .notification-link:focus{' +
			'outline:1px solid #007fd4;outline-offset:-1px}.github1s-notification .notification-footer{padding-right:' +
			'20px;display:flex;flex-direction:column;justify-content:center;min-width:140px}.github1s-notification ' +
			'.notification-footer .notification-confirm-button{border:none;width:100%;height:26px;margin-bottom:2px;' +
			'text-align:center;outline:1px solid transparent;outline-offset:2px!important;color:#fff;background-color:' +
			'#0e639c;cursor:pointer}.github1s-notification .notification-footer .notification-confirm-button:hover{' +
			'background-color:#17b}.github1s-notification .notification-footer .notification-confirm-button:focus{' +
			'outline-color:#007fd4}.github1s-notification .notification-footer .notification-show-me-again{color:#ccc;' +
			'font-size:12px;display:flex;align-items:center}';

		const styleElement = document.createElement('style');
		styleElement.innerHTML = notificationStylesText;
		document.head.appendChild(styleElement);

		// prettier-ignore
		const notificationBlocksHtml = notifications.map((item) => {
				const linkHtml = item.link ? ' <a class="notification-link" href="' + item.link + '" target="_blank">See more</a>' : '';
				const titleHtml = '<div class="notification-main"><div class="notification-title">' + item.title + '</div>';
				const contentHtml = '<div class="notification-content">' + item.content + linkHtml + '</div></div>';
				return titleHtml + contentHtml;
			});
		const notificationHtml =
			notificationBlocksHtml +
			'<div class="notification-footer"><button class="notification-confirm-button">OK</button>' +
			'<div class="notification-show-me-again"><input type="checkbox" checked>Don\'t show me again</div></div></div>';

		const notificationElement = document.createElement('div');
		notificationElement.classList.add('github1s-notification');
		notificationElement.innerHTML = notificationHtml;
		document.body.appendChild(notificationElement);

		notificationElement.querySelector('.notification-confirm-button').onclick = () => {
			const notShowMeAgain = !!notificationElement.querySelector('.notification-show-me-again input').checked;
			if (notShowMeAgain) {
				window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, NOTIFICATION_STORAGE_VALUE);
			}
			document.body.removeChild(notificationElement);
		};
	};
	/*** end notificaton block ***/

	window.vscodeWeb = {
		windowIndicator: { label: repository },
		additionalBuiltinExtensions: [],
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
			{
				id: 'github1s.commands.vscode.connectToGitHub',
				handler: ConnectToGitHub,
			},
		],
		product: productJson,
		builtinExtensions: window.github1sExtensions || [],
		folderUri: { scheme: scheme, authority: '', path: '/' },
		workspaceId: scheme + ':' + repository,
		workspaceLabel: repository,
		hideTextFileReadonlyIcon: false,
		logo: {
			icon: logoIcon,
			title: 'Open on ' + platformName,
			onClick() {
				const targetPath = window.location.pathname + window.location.search + window.location.hash;
				window.open(platformOrigin + targetPath, '_blank');
			},
		},
		onWorkbenchReady() {
			const loadSpinner = document.querySelector('#load-spinner');
			loadSpinner && loadSpinner.remove();
			renderNotification();
		},
	};
})();
