/**
 * @file page entry
 * @author netcon
 */

import { ConnectToGitHub } from './github-auth';
import { ConnectToGitLab } from './gitlab-auth';
import { renderNotification } from './notification';
import { createProductConfiguration } from './product';
import { createVSCodeWebConfig, createWorkbenchOptions, Platform } from './config';

const resolvePlatformState = (): [Platform, string] => {
	const hostname = window.location.hostname;
	const pathParts = window.location.pathname.split('/').filter(Boolean);

	if (hostname.match(/^(.*\.)?gitlab1s\.com$/i)) {
		const dashIndex = pathParts.indexOf('-');
		const repository = (dashIndex < 0 ? pathParts : pathParts.slice(0, dashIndex)).join('/');
		return [Platform.GitLab, repository];
	}
	if (hostname.match(/^(.*\.)?bitbucket1s\.org$/i)) {
		const repository = pathParts.length >= 2 ? pathParts.slice(0, 2).join('/') : '';
		return [Platform.Bitbucket, repository];
	}
	if (hostname.match(/^(.*\.)?npmjs1s\.com$/i)) {
		const trimmedParts = pathParts[0] === 'package' ? pathParts.slice(1) : pathParts;
		const packageParts = trimmedParts.slice(0, trimmedParts[0] && trimmedParts[0][0] === '@' ? 2 : 1);
		const repository = pathParts.length ? packageParts.join('/') || 'package' : '';

		return [Platform.npm, repository];
	}

	const repository = pathParts.slice(0, 2).join('/');
	return [Platform.GitHub, repository];
};

const [platform, repository] = resolvePlatformState();
const resolveVscodeUrl = (path: string) => new URL(path, globalThis._VSCODE_FILE_ROOT).href;

const vscodeCommands = [
	{ id: 'github1s.commands.vscode.getBrowserUrl', handler: () => window.location.href },
	{ id: 'github1s.commands.vscode.replaceBrowserUrl', handler: (url: string) => history.replaceState(null, '', url) },
	{ id: 'github1s.commands.vscode.pushBrowserUrl', handler: (url: string) => history.pushState(null, '', url) },
	{ id: 'github1s.commands.vscode.connectToGitHub', handler: ConnectToGitHub },
	{ id: 'github1s.commands.vscode.connectToGitLab', handler: ConnectToGitLab },
];

globalThis._VSCODE_WEB = {
	allowEditorLabelOverride: true,
	builtinExtensions: GITHUB1S_EXTENSIONS || [],
	onWorkbenchReady() {
		const loadSpinner = document.querySelector('#load-spinner');
		loadSpinner && loadSpinner.remove();
		renderNotification(platform);
	},
	...createVSCodeWebConfig(platform, repository),
};

if (!DEV_VSCODE) {
	const linkElement = document.createElement('link');
	linkElement.setAttribute('rel', 'stylesheet');
	linkElement.setAttribute('href', resolveVscodeUrl('vs/workbench/workbench.web.main.css'));
	document.head.appendChild(linkElement);

	const languageId = document.cookie.match(/(^| )vscode.nls.locale=([^;]+)/)?.[2] || '';
	const nlsUrl = AVAILABLE_LANGUAGES.includes(languageId)
		? resolveVscodeUrl(`../nls/${languageId}/nls.messages.js`)
		: resolveVscodeUrl('nls.messages.js');
	const scriptElement = document.createElement('script');
	scriptElement.setAttribute('src', nlsUrl);
	document.body.appendChild(scriptElement);
}

dynamicImport(resolveVscodeUrl('vs/workbench/workbench.web.main.internal.js')).then(({ create, env, URI }) => {
	const resolveWorkspace = (workspace: any) => {
		if (workspace?.folderUri) {
			return { folderUri: URI.from(workspace.folderUri) };
		}
		if (workspace?.workspaceUri) {
			return { workspaceUri: URI.from(workspace.workspaceUri) };
		}
		return { workspaceUri: URI.from({ scheme: 'tmp', path: '/default.code-workspace' }) };
	};

	const vscodeWebConfig = {
		commands: vscodeCommands,
		webviewEndpoint: resolveVscodeUrl('vs/workbench/contrib/webview/browser/pre'),
		productConfiguration: createProductConfiguration(platform),
		initialColorTheme: { themeType: 'dark' as any },
		...createWorkbenchOptions(platform, repository),
	};

	const workspaceProvider = {
		trusted: true,
		workspace: resolveWorkspace(globalThis._VSCODE_WEB.workspace),
		open: () => Promise.resolve(false),
	};

	create(document.body, { workspaceProvider, ...vscodeWebConfig });
	env.getUriScheme().then((scheme: any) => globalThis._VSCODE_WEB.onWorkbenchReady?.(scheme));
});
