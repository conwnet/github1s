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
	return response.json().then((body) => body?.data || []);
};

export type RepoItem = {
	collection_names?: string;
	contributor_logins?: string;
	description?: string;
	forks?: number;
	language?: string;
	repo_name: string;
	stars?: number;
	total_score?: number;
};

export const getTrendingRepos = (period: RankingPeriod, language: string): Promise<RepoItem[]> => {
	const encodedLanguage = encodeURIComponent(language) || 'All';
	const periodValue =
		period === RankingPeriod.Today ? 'past_24_hours' : RankingPeriod.ThisWeek ? 'past_week' : 'past_month';
	const requestUrl = `${OSSInsightEndpoint}/q/trending-repos?language=${encodedLanguage}&period=${periodValue}`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export type RecentHotCollectionItem = {
	id: number;
	last_2nd_month_rank: number;
	last_month_rank: number;
	name: string;
	rank: number;
	rank_changes: number;
	repo_id: number;
	repo_name: string;
	repos: number;
	visits: number;
};

export const getRecentHotCollections = (): Promise<RecentHotCollectionItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/q/recent-hot-collections`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export type CollectionItem = {
	id: number;
	name: string;
	public: number;
};

export const getCollections = memorize((): Promise<CollectionItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/collections`;
	return fetch(requestUrl).then(resolveDataFromResponse);
});

export const getCollectionIdByName = async (collectionName: string): Promise<number | null> => {
	const collections = await getCollections();
	return collections.find((item) => item.name === collectionName)?.id || null;
};

export type Last28DaysRankItem = {
	last_2nd_period_rank: number;
	last_2nd_period_total: number;
	last_period_rank: number;
	last_period_total: number;
	rank_pop: number;
	repo_id: number;
	repo_name: string;
	total: number;
	total_pop: number;
};

export const getCollectionStarsLast28DaysRank = (collectionId: number): Promise<Last28DaysRankItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/q/collection-stars-last-28-days-rank?collectionId=${collectionId}`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export const getCollectionPullRequestsLast28DaysRank = (collectionId: number): Promise<Last28DaysRankItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/q/collection-pull-requests-last-28-days-rank?collectionId=${collectionId}`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export const getCollectionIssuesLast28DaysRank = (collectionId: number): Promise<Last28DaysRankItem[]> => {
	const requestUrl = `${OSSInsightEndpoint}/q/collection-issues-last-28-days-rank?collectionId=${collectionId}`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};

export type CollectionStarsMonthRankItem = {
	current_month: string;
	current_month_rank: number;
	current_month_total: number;
	last_month: string;
	last_month_rank: number;
	last_month_total: number;
	rank_mom: number;
	repo_id: number;
	repo_name: string;
	total: number;
	total_mom: number;
};

export const getCollectionStarsMonthRank = (collectionId: number) => {
	const requestUrl = `https://api.ossinsight.io/q/collection-stars-last-28-days-rank?collectionId=${collectionId}`;
	return fetch(requestUrl).then(resolveDataFromResponse);
};
