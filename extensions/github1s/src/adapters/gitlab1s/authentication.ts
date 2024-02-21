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
		OAuthButtonLogoClass: 'gitlab-logo',
		OAuthButtonText: 'Connect to GitLab',
		createTokenLink: 'https://gitlab.com/-/profile/personal_access_tokens?scopes=api&name=GitLab1s',
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
