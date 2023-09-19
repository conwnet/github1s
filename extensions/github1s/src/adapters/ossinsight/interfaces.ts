/**
 * @file trending interfaces
 * @author netcon
 */

import { memorize } from '@/helpers/func';
import { RankingPeriod } from './constants';

const OSSInsightEndpoint = `https://api.ossinsight.io`;

const resolveDataFromResponse = (response: Response) => {
	if (response.status < 200 || response.status >= 300) {
		return [];
	}
	return response.json().then((body) => body?.data?.rows || []);
};

export type RepoItem = {
	collection_names?: string;
	contributor_logins?: string;
	description?: string;
	forks: string;
	language?: string;
	repo_name: string;
	stars: string;
	total_score: string;
};

export const getTrendingRepos = (period: RankingPeriod, language: string): Promise<RepoItem[]> => {
	const encodedLanguage = encodeURIComponent(language) || 'All';
	const periodValue =
		period === RankingPeriod.Today ? 'past_24_hours' : RankingPeriod.ThisWeek ? 'past_week' : 'past_month';
	const requestUrl = `${OSSInsightEndpoint}/v1/trends/repos/?language=${encodedLanguage}&period=${periodValue}`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export type RecentHotCollectionItem = {
	id: string;
	name: string;
	repos: string;
	repo_id: string;
	repo_name: string;
	repo_rank_changes: string;
	repo_past_period_rank: string;
	repo_current_period_rank: string;
};

export const getRecentHotCollections = (): Promise<RecentHotCollectionItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/v1/collections/hot/`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export type CollectionItem = {
	id: string;
	name: string;
};

export const getCollections = memorize((): Promise<CollectionItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/v1/collections/`;
	return fetch(requestUrl).then(resolveDataFromResponse);
});

export const getCollectionIdByName = async (collectionName: string): Promise<string | null> => {
	const collections = await getCollections();
	return collections.find((item) => item.name === collectionName)?.id || null;
};

export type Last28DaysRankItem = {
	repo_id: string;
	repo_name: string;
	current_period_growth: string;
	past_period_growth: string;
	growth_pop: string;
	rank_pop: string;
	total: string;
	current_period_rank: string;
	past_period_rank: string;
};

export const getCollectionStarsLast28DaysRank = (collectionId: string): Promise<Last28DaysRankItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/v1/collections/${collectionId}/ranking_by_stars/`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export const getCollectionPullRequestsLast28DaysRank = (collectionId: string): Promise<Last28DaysRankItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/v1/collections/${collectionId}/ranking_by_issues/`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export const getCollectionIssuesLast28DaysRank = (collectionId: string): Promise<Last28DaysRankItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/v1/collections/${collectionId}/ranking_by_prs/`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};
