/**
 * @file Trending page
 * @author netcon
 */

import { RankingPeriod, RepoItem } from './constants';

const createRepoItemMarkdown = (repo: RepoItem, period: RankingPeriod) => {
	const contributorAvatars = (repo.contributor_logins?.split(',') || []).map((username) => {
		return `[<img class="avatar" src="https://github.com/${username}.png" alt="${username}" width="18" >](https://github.com/${username})`;
	});
	const repoBadges = [
		`![Language](https://img.shields.io/github/languages/top/${repo.repo_name})`,
		`![Watch](https://img.shields.io/github/watchers/${repo.repo_name}?label=Watch)`,
		`![Fork](https://img.shields.io/github/forks/${repo.repo_name}?label=Fork)`,
		`![Star](https://img.shields.io/github/stars/${repo.repo_name}?label=Star)`,
		`![LastCommit](https://img.shields.io/github/last-commit/${repo.repo_name})`,
	];

	const contributorsMardown = contributorAvatars.length
		? ' &nbsp;&nbsp; Built by &nbsp;' + contributorAvatars.join('&nbsp;')
		: '';
	const collectionMarkdown = repo.collection_names ? ` &nbsp;&nbsp; <i>${repo.collection_names}</i>` : '';
	const fireThreshold = period === RankingPeriod.ThisWeek ? 5000 : period === RankingPeriod.ThisMonth ? 12000 : 1000;

	return `
## ${(repo.total_score || 0) >= fireThreshold ? '🔥' : '🚀'} [${repo.repo_name}](https://github1s.com/${repo.repo_name})

${repo.description || ''}

⭐️ +${repo.stars || 0} &nbsp;&nbsp; 🔗 +${repo.forks || 0}${contributorsMardown}${collectionMarkdown}

${repoBadges.join('&nbsp;')}
`;
};

export const createRankingPageMarkdown = (repos: RepoItem[], period: RankingPeriod, language: string) => {
	const periodTextInTitle =
		period === RankingPeriod.ThisWeek ? 'This Week' : period === RankingPeriod.ThisMonth ? 'This Month' : 'Today';
	const periodTextInContent =
		period === RankingPeriod.ThisWeek ? 'this week' : period === RankingPeriod.ThisMonth ? 'this month' : 'today';

	const repoItemsMarkdown = repos.map((repo) => createRepoItemMarkdown(repo, period));

	return `
<style>.avatar { border-radius: 50%; vertical-align: middle; }</style>

# Trending Repos ${periodTextInTitle}${language ? ` (${language})` : ''}

See what the GitHub community is most excited about ${periodTextInContent}. Rankings data is from [OSS Insight](https://ossinsight.io/).

Other Rankings: &nbsp; [Today]() &nbsp;&nbsp; [This Week]() &nbsp;&nbsp; [This Month]() &nbsp;&nbsp; [Languages]() &nbsp;&nbsp; [Collections]() &nbsp;&nbsp; [GitHub Trending]()

***

${repoItemsMarkdown.join('\n\n***\n\n')}

***
`;
};
