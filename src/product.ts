import { Platform } from './config';

export const createProductConfiguration = (platform: Platform) => ({
	nameShort: platform + '1s',
	nameLong: platform + '1s',
	applicationName: platform + '1s',
	reportIssueUrl: 'https://github.com/conwnet/github1s/issues/new',
	extensionsGallery: {
		serviceUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery',
		cacheUrl: 'https://vscode.blob.core.windows.net/gallery/index',
		itemUrl: 'https://marketplace.visualstudio.com/items',
		resourceUrlTemplate: window.location.origin + '/api/vscode-unpkg/{publisher}/{name}/{version}/{path}',
		controlUrl: 'https://az764295.vo.msecnd.net/extensions/marketplace.json',
		recommendationsUrl: 'https://az764295.vo.msecnd.net/extensions/workspaceRecommendations.json.gz',
		nlsBaseUrl: '',
		publisherUrl: '',
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
});
