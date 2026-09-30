/**
 * @file gitlab authentication page
 * @author netcon
 */

import { GitHub1sAuthenticationView } from '../github1s/authentication';
import { GitLabTokenManager } from './token';
import { getCurrentRepo } from './parse-path';
import { resolveProjectAccessTokenLink } from './links';

export class GitLab1sAuthenticationView extends GitHub1sAuthenticationView {
	protected tokenManager = GitLabTokenManager.getInstance();
	protected pageTitle = 'Authenticating to GitLab';
	protected OAuthCommand = 'github1s.commands.vscode.connectToGitLab';
	protected pageConfig = {
		authenticationFormTitle: 'Authenticating to GitLab',
		OAuthButtonText: 'Connect to GitLab',
		OAuthButtonLogo: 'assets/pages/assets/gitlab.svg',
		createTokenLink: resolveProjectAccessTokenLink(''),
		authenticationFeatures: [
			{
				text: 'Use a Project Access Token from Settings → Access Tokens (glpat-)',
				link: 'https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html',
			},
			{
				text: 'Do not use Pipeline trigger tokens (glptt-) for code browsing',
				link: 'https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html',
			},
		],
	};

	public open(notice: string = '', withBarrier = false) {
		return getCurrentRepo().then((repo) => {
			this.pageConfig = {
				...this.pageConfig,
				createTokenLink: resolveProjectAccessTokenLink(repo),
			};
			return super.open(notice, withBarrier);
		});
	}
}
