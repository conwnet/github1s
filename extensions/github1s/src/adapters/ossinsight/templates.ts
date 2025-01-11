/**
 * @file Trending page
 * @author netcon
 */

import { trimEnd } from '@/helpers/util';
import { RankingLanguages, RankingPeriod } from './constants';
import {
	getCollections,
	getCollectionIdByName,
	getCollectionIssuesLast28DaysRank,
	getCollectionPullRequestsLast28DaysRank,
	getCollectionStarsLast28DaysRank,
	getRecentHotCollections,
	getTrendingRepos,
	RepoItem,
} from './interfaces';

const buildRepoLink = (repo: string) => `https://github1s.com/${repo}`;

const dataSourceMarkdown = ` (Data source: [👁️ OSS Insight](https://ossinsight.io/?utm_source=github1s&utm_medium=github&utm_campaign=ghtrending))`;

const createRepoItemMarkdown = (repo: RepoItem, period: RankingPeriod) => {
	const contributorAvatars = (repo.contributor_logins?.split(',') || []).map((username) => {
		// too many avatars may trigger github rate limits
		// return `[<img class="avatar" src="https://github.com/${username}.png" alt="${username}" width="18" style="border-radius: 50%; vertical-align: middle;">](https://github.com/${username})`;
		return `[${username}](https://github.com/${username})`;
	});
	const repoBadges = [
		`[![Language](https://img.shields.io/github/languages/top/${repo.repo_name})](https://github.com/${repo.repo_name})`,
		`[![Watch](https://img.shields.io/github/watchers/${repo.repo_name}?label=Watch)](https://github.com/${repo.repo_name}/watchers)`,
		`[![Fork](https://img.shields.io/github/forks/${repo.repo_name}?label=Fork)](https://github.com/${repo.repo_name}/forks)`,
		`[![Star](https://img.shields.io/github/stars/${repo.repo_name}?label=Star)](https://github.com/${repo.repo_name}/stargazers)`,
		`[![LastCommit](https://img.shields.io/github/last-commit/${repo.repo_name})](https://github.com/${repo.repo_name}/commits)`,
	];

	const increaseStarsText = (+repo.stars || 0) >= 0 ? `+${repo.stars || 0}` : `-${repo.stars}`;
	const increaseForksText = (+repo.forks || 0) >= 0 ? `+${repo.forks || 0}` : `-${repo.forks}`;
	const contributorsMarkdown = contributorAvatars.length
		? ' &nbsp;&nbsp; Built by &nbsp;' + contributorAvatars.join('&nbsp;&nbsp;')
		: '';
	const collectionMarkdown = repo.collection_names ? ` &nbsp;&nbsp; <i>${repo.collection_names}</i>` : '';
	const fireThreshold = period === RankingPeriod.ThisWeek ? 5000 : period === RankingPeriod.ThisMonth ? 12000 : 1000;

	return `
## ${(+repo.total_score || 0) >= fireThreshold ? '🔥' : '🚀'} [${repo.repo_name}](${buildRepoLink(repo.repo_name)})

${repo.description || ''}

⭐️ ${increaseStarsText} &nbsp;&nbsp; 🔗 ${increaseForksText} ${contributorsMarkdown}${collectionMarkdown}

${repoBadges.join('&nbsp;')}
`;
};

export type PageType = RankingPeriod | 'Languages' | 'Collections' | '';
const createRankingsLinksMarkdown = (page: PageType) => {
	const rankingLinks = [
		page !== RankingPeriod.Today ? `[Today](/README.md)` : 'Today',
		page !== RankingPeriod.ThisWeek ? `[This Week](/ThisWeek.md)` : 'This Week',
		page !== RankingPeriod.ThisMonth ? `[This Month](/ThisMonth.md)` : 'This Month',
		page !== 'Languages' ? `[Languages](/Languages.md)` : 'Languages',
		page !== 'Collections' ? `[Collections](/Collections.md)` : 'Collections',
		`[GitHub Trending](https://github.com/trending)`,
	];
	return rankingLinks.join(' &nbsp;&nbsp; ');
};

export const createRankingPageMarkdown = async (period: RankingPeriod, language = '', collection = '') => {
	const periodTextInTitle =
		period === RankingPeriod.ThisWeek ? 'This Week' : period === RankingPeriod.ThisMonth ? 'This Month' : 'Today';
	const periodTextInContent =
		period === RankingPeriod.ThisWeek ? 'this week' : period === RankingPeriod.ThisMonth ? 'this month' : 'today';

	const repoItems = (await getTrendingRepos(period, language)).slice(0, 30);
	const repoItemsMarkdown = repoItems.map((repo) => createRepoItemMarkdown(repo, period));
	const currentPage = language || collection ? '' : period;

	return `
# Trending Repos ${periodTextInTitle}${language ? ` (${language})` : ''}

See what the GitHub community is most excited about ${periodTextInContent}.${dataSourceMarkdown}

Other Rankings: &nbsp; ${createRankingsLinksMarkdown(currentPage)}

***

${repoItemsMarkdown.join('\n\n***\n\n')}

***
`;
};

export const createLanguageListPageMarkdown = () => {
	const languageListMarkdown = RankingLanguages.map((language) => {
		const todayLink = encodeURIComponent(`./languages/${language}/${language}_Today.md`);
		const thisWeekLink = encodeURIComponent(`./languages/${language}/${language}_ThisWeek.md`);
		const thisMonthLink = encodeURIComponent(`./languages/${language}/${language}_ThisMonth.md`);
		return `${language} | [Today](${todayLink}) | [This Week](${thisWeekLink}) | [This Month](${thisMonthLink})`;
	});

	return `
# Trending Repos by Languages

See what the GitHub community is most excited by languages.${dataSourceMarkdown}  

Other Rankings: &nbsp; ${createRankingsLinksMarkdown('Languages')}

***

| Language | Today | This Week | This Month |
| -- | -- | -- | -- |
${languageListMarkdown.join('\n')}

***
`;
};

const getPopCountText = (pop_count: number, percentage = false) => {
	const absValue = Math.abs(pop_count);
	const valueText = percentage ? `${trimEnd(absValue.toFixed(1), '0.')}%` : absValue;
	return pop_count > 0
		? ` <span style="color: #30d158">(+${valueText})</span>`
		: pop_count < 0
			? ` <span style="color: #ff453a">(-${valueText})</span>`
			: '';
};

const getRankChangeText = (rank_change: number) => {
	const absValue = Math.abs(rank_change);
	return rank_change > 0
		? ` <span style="color: #ff453a">(↓${absValue})</span>`
		: rank_change < 0
			? ` <span style="color: #30d158">(↑${absValue})</span>`
			: '';
};

export const createCollectionsListPageMarkdown = async () => {
	const collectionReposMap = new Map<string, [string, string][]>();
	const [hotCollections, allCollections] = await Promise.all([getRecentHotCollections(), getCollections()]);
	const sortedCollections = hotCollections.sort(
		(itemA, itemB) => +itemA.repo_current_period_rank - +itemB.repo_current_period_rank,
	);
	const uniqueCollections = sortedCollections.filter((collection) => {
		const relativeRankText = getRankChangeText(+collection.repo_rank_changes);
		if (!collectionReposMap.has(collection.name)) {
			collectionReposMap.set(collection.name, [[collection.repo_name, relativeRankText]]);
			return true;
		}
		collectionReposMap.get(collection.name)?.push([collection.repo_name, relativeRankText]);
		return false;
	});

	const hotCollectionsMarkdown = uniqueCollections.map((collection) => {
		const collectionMarkdown = ` [${collection.name}](/collections/${encodeURIComponent(collection.name)}.md)`;
		const repos = [...(collectionReposMap.get(collection.name) || [])];
		const firstRepo = repos[0] ? `[${repos[0][0]}](${buildRepoLink(repos[0][0])})${repos[0][1]} ` : '';
		const secondRepo = repos[1] ? `[${repos[1][0]}](${buildRepoLink(repos[1][0])})${repos[1][1]} ` : '';
		const thirdRepo = repos[2] ? `[${repos[2][0]}](${buildRepoLink(repos[2][0])})${repos[2][1]} ` : '';
		const hotReposMarkdown = ` ${firstRepo}| ${secondRepo}| ${thirdRepo}|`;
		return `|${collectionMarkdown} | ${collection.repos} |${hotReposMarkdown} |`;
	});

	const allCollectionsMarkdown = allCollections.map((collection) => {
		return `[${collection.name}](/collections/${encodeURIComponent(collection.name)}.md)`;
	});

	return `
# Trending Repos by Collections

Insights about the monthly and historical rankings and trends in technical fields with curated repository lists.${dataSourceMarkdown}

Other Rankings: &nbsp; ${createRankingsLinksMarkdown('Collections')}

***

## Recent Hot Collections

| Collection | Repos | 1st repo | 2nd repo | 3rd repo |
| -- | -- | -- | -- | -- |
${hotCollectionsMarkdown.join('\n')}

***

## All Collections

${allCollectionsMarkdown.join(' &nbsp; | &nbsp; ')}

***

`;
};

export const createCollectionPageMarkdown = async (collectionName: string) => {
	const collectionId = await getCollectionIdByName(collectionName);
	if (!collectionId) {
		throw new Error('Unable to find ranking data for ' + collectionName);
	}
	const [starsData, pullsData, issuesData] = await Promise.all([
		getCollectionStarsLast28DaysRank(collectionId),
		getCollectionPullRequestsLast28DaysRank(collectionId),
		getCollectionIssuesLast28DaysRank(collectionId),
	]);

	const starRankListMarkdown = starsData.map((item) => {
		const rankMarkdown = ` ${item.current_period_rank}${getRankChangeText(+item.rank_pop)}`;
		const repoMarkdown = ` [${item.repo_name}](${buildRepoLink(item.repo_name)})`;
		const starsMarkdown = ` ${item.current_period_growth}${getPopCountText(+item.growth_pop, true)}`;
		return `|${rankMarkdown} |${repoMarkdown} |${starsMarkdown} | ${item.past_period_growth} | ${item.total} |`;
	});

	const pullRankListMarkdown = pullsData.map((item) => {
		const rankMarkdown = ` ${item.current_period_rank}${getRankChangeText(+item.rank_pop)}`;
		const repoMarkdown = ` [${item.repo_name}](${buildRepoLink(item.repo_name)})`;
		const starsMarkdown = ` ${item.current_period_growth}${getPopCountText(+item.growth_pop, true)}`;
		return `|${rankMarkdown} |${repoMarkdown} |${starsMarkdown} | ${item.past_period_growth} | ${item.total} |`;
	});

	const issuesRankListMarkdown = issuesData.map((item) => {
		const rankMarkdown = ` ${item.current_period_rank}${getRankChangeText(+item.rank_pop)}`;
		const repoMarkdown = ` [${item.repo_name}](${buildRepoLink(item.repo_name)})`;
		const starsMarkdown = ` ${item.current_period_growth}${getPopCountText(+item.growth_pop, true)}`;
		return `|${rankMarkdown} |${repoMarkdown} |${starsMarkdown} | ${item.past_period_growth} | ${item.total} |`;
	});

	return `
# ${collectionName} - Ranking

Last 28 days ranking of repos in this collection by stars, pull requests, issues. Historical Ranking by Popularity.${dataSourceMarkdown}

Other Rankings: &nbsp; ${createRankingsLinksMarkdown('')}

***

## Last 28 days Ranking - Stars

| Rank | Repo | Last 28 Days | Last 56 Days | Total |
| -- | -- | -- | -- | -- |
${starRankListMarkdown.join('\n')}

***

## Last 28 days Ranking - Pull Requests

| Rank | Repo |  Last 28 Days | Last 56 Days | Total |
| -- | -- | -- | -- | -- |
${pullRankListMarkdown.join('\n')}

***

## Last 28 days Ranking - Issues

| Rank | Repo |  Last 28 Days | Last 56 Days | Total |
| -- | -- | -- | -- | -- |
${issuesRankListMarkdown.join('\n')}

***

`;
};
