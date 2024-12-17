/**
 * @file Show Sponsors In Status Bar
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { adapterManager } from '@/adapters';
import { PlatformName } from '@/adapters/types';

const resolveSourcegraphLink = async () => {
	const { repo, ref } = await router.getState();
	switch (adapterManager.getCurrentAdapter().platformName) {
		case PlatformName.GitHub:
			return `https://sourcegraph.com/github.com/${repo}@${ref}`;
		case PlatformName.GitLab:
			return `https://sourcegraph.com/gitlab.com/${repo}@${ref}`;
		case PlatformName.Bitbucket:
			return `https://sourcegraph.com/bitbucket.org/${repo}@${ref}`;
		default:
			return 'https://sourcegraph.com';
	}
};

const resolveSponsors = async () => {
	return [
		{
			name: 'Sourcegraph',
			link: await resolveSourcegraphLink(),
			description: 'Universal code search',
		},
	];
};

export const showSponsors = async () => {
	const titleItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	titleItem.text = '  $(heart) Sponsors:';
	titleItem.show();

	(await resolveSponsors()).forEach((sponsor) => {
		const sponsorItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
		sponsorItem.text = sponsor.name;
		sponsorItem.tooltip = sponsor.description;
		sponsorItem.command = {
			title: `Visit ${sponsor.name}`,
			command: 'vscode.open',
			arguments: [vscode.Uri.parse(sponsor.link)],
		};
		sponsorItem.show();
	});
};
