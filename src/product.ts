import { Platform } from './config';

export const createProductConfiguration = (platform: Platform) => ({
	nameShort: platform + '1s',
	nameLong: platform + '1s',
	applicationName: platform + '1s',
	reportIssueUrl: 'https://github.com/conwnet/github1s/issues/new',
	extensionsGallery: {
		resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
		extensionUrlTemplate: 'https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest',
		serviceUrl: 'https://open-vsx.org/vscode/gallery',
		itemUrl: 'https://open-vsx.org/vscode/item',
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
		'*.sourcegraph.com',
		'*.ossinsight.io',
		'*.open-vsx.org',
	],
	extensionEnabledApiProposals: { 'ms-vscode.anycode': ['extensionsAny'] },
});
