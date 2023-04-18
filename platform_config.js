/**
 * @enum {String} Platform
 */
export const Platform = {
	GitHub: 'GitHub',
	GitHubEnterprise: 'GitHubEnterprise',
	GitLab: 'GitLab',
	Bitbucket: 'Bitbucket',
	npm: 'npm',
};

// insert your desire github1s platform
// ex) To enable GitHubEnterprise, then set it as Platform.GitHub
/**
 * @typeDef {(Platform.GitHub | Platform.GitHubEnterprise)} DefaultPlatform
 */
export const DefaultPlatform = Platform.GitHub;

export class ConfigsForEnterprise {
	// if DefaultPlatform is Platform.GitHubEnterprise, then items below must be rewritten
	// insert your baseUrl. It is used to access to most cases.
	// access ex) https://your.enterprise.url/some_org/some_repo/blob/some_branch/dir1/dir2/filename
	static github_enterprise_baseUrl = 'https://your.enterprise.url';

	// insert your api url. It is used to access to api.
	// if you uses GitHub Enterprise API v3, then set it as http(s)://HOSTNAME/api/v3
	// access ex) https://your.enterprise.url/api/v3/repos/some_org/some_repo/commits
	static github_enterprise_api_url = 'https://your.enterprise.url/api/v3';

	// insert your github enterprise client_id
	// how to get a new client_id: https://your.enterprise.url/settings/applications/new
	static github_enterprise_client_id = 'xxxxxxxxxxxxxxxxxxxx';

	// insert your github1s server url(NOT github enterprise baseUrl!) on which your github1s applications are running
	// It is required to get authentication token from your github enterprise to your github1s server.
	static auth_page_origin = 'https://your.github1s.server';
}
