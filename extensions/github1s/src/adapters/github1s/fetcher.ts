/**
 * @file github api fetcher base octokit
 * @author netcon
 */

class GitHubFetcher {
	private static instance: GitHubFetcher = null;

	private constructor() {}

	public static getInstance(): GitHubFetcher {
		if (GitHubFetcher.instance) {
			return GitHubFetcher.instance;
		}
		return (GitHubFetcher.instance = new GitHubFetcher());
	}
}
