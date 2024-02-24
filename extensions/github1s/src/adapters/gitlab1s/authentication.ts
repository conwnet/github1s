/**
 * @file gitlab authentication page
 * @author netcon
 */

import { GitHub1sAuthenticationView } from '../github1s/authentication';
import { GitLabTokenManager } from './token';

export class GitLab1sAuthenticationView extends GitHub1sAuthenticationView {
	protected tokenManager = GitLabTokenManager.getInstance();
	protected pageTitle = 'Authenticating to GitLab';
	protected OAuthCommand = 'github1s.commands.vscode.connectToGitLab';
	protected pageConfig = {
		authenticationFormTitle: 'Authenticating to GitLab',
		OAuthButtonText: 'Connect to GitLab',
		OAuthButtonLogo: 'assets/pages/assets/gitlab.svg',
		createTokenLink: `${GITLAB_ORIGIN}/-/profile/personal_access_tokens?scopes=read_api&name=GitLab1s`,
		authenticationFeatures: [
			{
				text: 'Access GitLab personal repository',
				link: 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html',
			},
			{
				text: 'Higher rate limit for GitLab official API',
				link: 'https://docs.gitlab.com/ee/security/rate_limits.html',
			},
		],
	};
}
