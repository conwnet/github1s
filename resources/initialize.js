(function () {
	/*** begin config block ***/
	const staticAssetsPath = '/static' + (window.staticHashCode ? '/' + window.staticHashCode : '');
	const staticAssetsPrefix = window.location.origin + staticAssetsPath;
	const nodeModulesPrefix = staticAssetsPrefix + '/node_modules';

	Object.keys(self.webPackagePaths).forEach((key) => {
		self.webPackagePaths[key] = `${nodeModulesPrefix}/${key}/${self.webPackagePaths[key]}`;
	});
	// config vscode loader
	if (window.require && window.require.config) {
		window.require.config({
			baseUrl: staticAssetsPrefix + '/vscode',
			paths: self.webPackagePaths,
		});
	}

	// build workbench config
	const createFolderWorkspace = (scheme) => ({ folderUri: { scheme, authority: '', path: '/' } });
	const openGitHub1sPage = () => window.open('https://github.com/conwnet/github1s', '_blank');
	const openOfficialPage = (origin) => {
		const targetPath = window.location.pathname + window.location.search + window.location.hash;
		return window.open(origin + targetPath, '_blank');
	};
	const createWindowIndicator = (label) => ({
		label: label || '$(remote)',
		command: 'github1s.commands.openRepository',
	});
	const createConfigurationDefaults = (disableSomeAnyCodeFeatures) => {
		const configurationDefaults = {
			'workbench.colorTheme': 'Default Dark+',
			'telemetry.telemetryLevel': 'off',
			'workbench.startupEditor': 'readme',
		};
		// disable some anycode features when we can use sourcegraph instead
		if (disableSomeAnyCodeFeatures) {
			configurationDefaults['anycode.language.features'] = {
				completions: false,
				definitions: false,
				references: false,
				highlights: true,
				outline: true,
				workspaceSymbols: true,
				folding: false,
				diagnostics: false,
			};
		}
		return configurationDefaults;
	};

	let platformName = 'GitHub';
	let platformConfig = {};
	const pathParts = window.location.pathname.split('/').filter(Boolean);
	if (window.location.hostname.match(/\.?gitlab1s\.com$/i)) {
		const dashIndex = pathParts.indexOf('-');
		const repository = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');

		platformName = 'GitLab';
		platformConfig = {
			hideTextFileLabelDecorations: !!repository,
			windowIndicator: createWindowIndicator(repository),
			configurationDefaults: createConfigurationDefaults(!!repository),
			workspace: repository ? createFolderWorkspace('gitlab1s') : undefined,
			workspaceId: repository ? 'gitlab1s:' + repository : '',
			workspaceLabel: repository,
			logo: {
				title: 'Open on GitLab',
				icon: staticAssetsPrefix + '/config/gitlab.svg',
				onClick: () => (repository ? openOfficialPage('https://gitlab.com') : openGitHub1sPage()),
			},
		};
	} else if (window.location.hostname.match(/\.?bitbucket1s\.org$/i)) {
		const repository = pathParts.length >= 2 ? pathParts.slice(0, 2).join('/') : '';

		platformName = 'Bitbucket';
		platformConfig = {
			hideTextFileLabelDecorations: !!repository,
			windowIndicator: createWindowIndicator(repository),
			configurationDefaults: createConfigurationDefaults(!!repository),
			workspace: repository ? createFolderWorkspace('bitbucket1s') : undefined,
			workspaceId: repository ? 'bitbucket1s:' + repository : '',
			workspaceLabel: repository,
			logo: {
				title: 'Open on Bitbucket',
				icon: staticAssetsPrefix + '/config/bitbucket.svg',
				onClick: () => (repository ? openOfficialPage('https://bitbucket.org') : openGitHub1sPage()),
			},
		};
	} else if (window.location.hostname.match(/\.?npmjs1s\.com$/i)) {
		const trimmedParts = pathParts[0] === 'package' ? pathParts.slice(1) : pathParts;
		const packageParts = trimmedParts.slice(0, trimmedParts[0] && trimmedParts[0][0] === '@' ? 2 : 1);
		const repository = pathParts.length ? packageParts.join('/') || 'package' : '';

		platformName = 'npm';
		platformConfig = {
			hideTextFileLabelDecorations: !!repository,
			windowIndicator: createWindowIndicator(repository),
			configurationDefaults: createConfigurationDefaults(false),
			workspace: repository ? createFolderWorkspace('npmjs1s') : undefined,
			workspaceId: repository ? 'npmjs1s:' + repository : '',
			workspaceLabel: repository,
			logo: {
				title: 'Open on npm',
				icon: staticAssetsPrefix + '/config/npm.svg',
				onClick: () => (repository ? openOfficialPage('https://npmjs.com') : openGitHub1sPage()),
			},
		};
	} else {
		const repository = pathParts.length >= 2 ? pathParts.slice(0, 2).join('/') : '';
		const isOnlineEditor = pathParts[0] === 'editor';

		platformName = 'GitHub';
		platformConfig = {
			hideTextFileLabelDecorations: !isOnlineEditor,
			windowIndicator: createWindowIndicator(repository),
			configurationDefaults: createConfigurationDefaults(!!repository),
			workspace: !isOnlineEditor ? createFolderWorkspace(repository ? 'github1s' : 'ossinsight') : undefined,
			workspaceId: !isOnlineEditor ? 'github1s:' + (repository || 'trending') : '',
			workspaceLabel: repository || (isOnlineEditor ? '' : 'GitHub Trending'),
			logo: {
				title: 'Open on GitHub',
				icon: staticAssetsPrefix + '/config/github.svg',
				onClick: () => (repository ? openOfficialPage('https://github.com') : openGitHub1sPage()),
			},
		};
	}

	// set product.json
	const productConfiguration = {
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
			'*.npmjs.com',
			'*.npmjs1s.com',
			'*.microsoft.com',
			'*.vercel.com',
			'*.sourcegraph.com',
			'*.gitpod.io',
			'*.ossinsight.io',
		],
		extensionEnabledApiProposals: { 'ms-vscode.anycode': ['extensionsAny'] },
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
		const NOTIFICATION_STORAGE_VALUE = '20210212';
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

	const vscodeCommands = [
		{ id: 'github1s.commands.vscode.getBrowserUrl', handler: () => window.location.href },
		{ id: 'github1s.commands.vscode.replaceBrowserUrl', handler: (url) => window.history.replaceState(null, '', url) },
		{ id: 'github1s.commands.vscode.pushBrowserUrl', handler: (url) => window.history.pushState(null, '', url) },
		{ id: 'github1s.commands.vscode.connectToGitHub', handler: ConnectToGitHub },
	];

	window.vscodeWeb = {
		additionalBuiltinExtensions: ['ms-vscode.anycode'],
		webviewEndpoint: staticAssetsPrefix + '/vscode/vs/workbench/contrib/webview/browser/pre',
		webWorkerExtensionHostIframeSrc:
			staticAssetsPrefix + '/vscode/vs/workbench/services/extensions/worker/httpWebWorkerExtensionHostIframe.html',
		commands: vscodeCommands,
		productConfiguration: productConfiguration,
		initialColorTheme: { themeType: 'dark' },
		builtinExtensions: window.github1sExtensions || [],
		onWorkbenchReady() {
			const loadSpinner = document.querySelector('#load-spinner');
			loadSpinner && loadSpinner.remove();
			renderNotification();
		},
		...platformConfig,
	};
})();
