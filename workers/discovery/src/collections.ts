import type { DiscoveryCollection } from './types.ts';

export const REPOSITORIES_PER_COLLECTION = 100;

// Curated coverage for the homepage, rather than a ranking of topic popularity.
export const TOPICS = [
	'developer-tools',
	'machine-learning',
	'llm',
	'web-development',
	'database',
	'devops',
	'security',
	'cli',
	'compiler',
	'game-development',
];

export type CollectionDefinition = Pick<DiscoveryCollection, 'id' | 'kind' | 'query' | 'sort'>;

export const getCollections = (now: Date): CollectionDefinition[] => {
	const dateBefore = (days: number) => new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
	return [
		{
			id: 'new-projects',
			kind: 'curated',
			query: `created:>=${dateBefore(30)} stars:>=20`,
			sort: 'stars',
		},
		{
			id: 'hidden-gems',
			kind: 'curated',
			query: `stars:50..999 pushed:>=${dateBefore(90)}`,
			sort: 'updated',
		},
		{
			id: 'most-starred',
			kind: 'curated',
			query: 'stars:>=10000',
			sort: 'stars',
		},
		...TOPICS.map(
			(id): CollectionDefinition => ({
				id,
				kind: 'topic',
				query: `topic:${id} stars:>=100`,
				sort: 'stars',
			}),
		),
	];
};
