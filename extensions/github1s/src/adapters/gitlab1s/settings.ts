/**
 * @file GitLab1s Settings Webview Provider
 * @author netcon
 */

import { GitLabTokenManager } from './token';
import { GitLabFetcher } from './fetcher';
import { GitHub1sSettingsViewProvider } from '../github1s/settings';

export class GitLab1sSettingsViewProvider extends GitHub1sSettingsViewProvider {
	protected tokenManager = GitLabTokenManager.getInstance();
	protected apiFetcher = GitLabFetcher.getInstance();

	protected OAuthCommand = 'github1s.commands.vscode.connectToGitLab';
	protected detailPageCommand = 'github1s.commands.openGitLab1sAuthPage';
	protected pageConfig = {
		pageDescriptionLines: [
			'You can provide a Personal Access Token or an OAuth token to access private repositories or to increase rate limits.',
			"Your token will only be stored locally in your browser. Don't forget to clean it while you are using a public device.",
		],
		OAuthButtonText: 'Connect to GitLab',
		createTokenLink: `${GITLAB_ORIGIN}/-/profile/personal_access_tokens?scopes=read_api&name=GitLab1s`,
	};
}
