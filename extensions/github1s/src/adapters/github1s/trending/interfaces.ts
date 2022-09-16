/**
 * @file trending interfaces
 * @author netcon
 */

import { RankingPeriod, RepoItem } from './constants';
import { createRankingPageMarkdown } from './templates';

const OSSInsightEndpoint = `https://api.ossinsight.io`;

export const getTrendingRepos = (period: RankingPeriod, language: string): Promise<RepoItem[]> => {
	const periodValue =
		period === RankingPeriod.Today ? 'past_24_hours' : RankingPeriod.ThisWeek ? 'past_week' : 'past_month';
	const requestUrl = `${OSSInsightEndpoint}/q/trending-repos?language=${language || 'All'}&period=${periodValue}`;

	return fetch(requestUrl).then((response) => {
		if (response.status < 200 || response.status >= 300) {
			return [];
		}
		return response.json().then((body) => body?.data || []);
	});
};

export const getContent = async () => {
	const repoItems = await getTrendingRepos(RankingPeriod.Today, '');
	return createRankingPageMarkdown(repoItems, RankingPeriod.Today, '');
};
