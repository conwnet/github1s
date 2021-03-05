/**
 * @file Show Sponsors In Status Bar
 * @author netcon
 */

import * as vscode from 'vscode';

const sponsors = [
	{
		name: 'Vercel',
		link: 'https://vercel.com/?utm_source=vscode-github1s&utm_campaign=oss',
		description: 'Develop. Preview. Ship.',
	},
	{
		name: 'Sourcegraph',
		link: 'https://sourcegraph.com',
		description: 'Universal code search',
	},
];

export const showSponsors = () => {
	const titleItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		0
	);
	titleItem.text = '  $(heart) Sponsors:';
	titleItem.show();

	sponsors.forEach((sponsor) => {
		const sponsorItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			0
		);
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
