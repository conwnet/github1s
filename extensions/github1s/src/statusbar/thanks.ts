/**
 * @file Show Thanks In Status Bar
 * @author netcon
 */

import * as vscode from 'vscode';
import router from '@/router';
import { getAdapter } from '@/adapters';
import { PlatformName } from '@/adapters/types';

const resolveSourcegraphLink = async () => {
	const { repo, ref } = router.getState();
	switch (getAdapter().platformName) {
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

const resolveThanks = async () => {
	return [
		{
			name: 'Sourcegraph',
			link: await resolveSourcegraphLink(),
			description: 'Universal code search',
		},
	];
};

export const showThanks = async () => {
	const titleItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	titleItem.text = '  $(heart) Thanks:';
	titleItem.show();

	(await resolveThanks()).forEach((service) => {
		const serviceItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
		serviceItem.text = service.name;
		serviceItem.tooltip = service.description;
		serviceItem.command = {
			title: `Visit ${service.name}`,
			command: 'vscode.open',
			arguments: [vscode.Uri.parse(service.link)],
		};
		serviceItem.show();
	});
};
