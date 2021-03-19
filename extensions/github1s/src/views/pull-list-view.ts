/**
 * @file GitHub Pull Request List View
 * @author netcon
 */

import * as vscode from 'vscode';
import { relativeTimeTo } from '@/helpers/date';
import repository, { RepositoryPull } from '@/repository';

const getPullTreeItemDescription = (pull: RepositoryPull) => {
	// current pull request is open
	if (pull.state === 'open') {
		return `opened ${relativeTimeTo(pull.created_at)} by ${pull.user.login}`;
	}

	// current pull request is merged
	if (pull.state === 'closed' && pull.merged_at) {
		return `by ${pull.user.login} was merged ${relativeTimeTo(pull.merged_at)}`;
	}

	// current pull is closed
	return `by ${pull.user.login} was closed ${relativeTimeTo(pull.closed_at)}`;
};

export class PullRequestTreeDataProvider
	implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewType = 'github1s.views.pull-request-list';

	getTreeItem(
		element: vscode.TreeItem
	): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
		// only recent 100 pull requests will be list here
		// TODO: implement pagination
		return repository.getPulls().then((pulls) => {
			return pulls.map((pull) => {
				const label = `#${pull.number} ${pull.title}`;
				const description = getPullTreeItemDescription(pull);
				const tooltip = `${label} (${description})`;
				const iconPath = vscode.Uri.parse(pull.user.avatar_url);
				const command = {
					title: 'Pull',
					command: 'github1s.switch-to-pull',
					arguments: [pull.number],
				};

				return { label, iconPath, description, tooltip, command };
			});
		});
	}
}
