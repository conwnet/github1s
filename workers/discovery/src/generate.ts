import { REPOSITORIES_PER_COLLECTION, getCollections } from './collections.ts';
import type { DiscoverySnapshot, Repository, RepositoryOwner, RepositoryLicense } from './types.ts';

export interface GenerateOptions {
	token: string;
	now?: Date;
	fetchImpl?: (url: URL, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<Response>;
	onProgress?: (message: string) => void;
}

// Each run is independent: all data comes from GitHub, with no stored baseline.
export const generateDiscovery = async ({
	token,
	now = new Date(),
	fetchImpl = fetch,
	onProgress = () => {},
}: GenerateOptions): Promise<DiscoverySnapshot> => {
	if (!token?.trim()) throw new Error('GITHUB_TOKEN is required.');
	const snapshot: DiscoverySnapshot = {
		generated_at: now.toISOString(),
		repositories: {},
		collections: [],
	};
	const headers = {
		Accept: 'application/vnd.github+json',
		Authorization: `Bearer ${token}`,
		'User-Agent': 'github1s-discovery',
	};

	// One page per collection, sequentially, to keep the request budget predictable.
	for (const { id, kind, query, sort } of getCollections(now)) {
		onProgress(`Fetching ${id}`);
		const searchQuery = `${query} is:public fork:false`;
		const url = new URL('https://api.github.com/search/repositories');
		url.search = new URLSearchParams({
			q: searchQuery,
			sort,
			order: 'desc',
			per_page: String(REPOSITORIES_PER_COLLECTION),
		}).toString();
		const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(30000) });
		if (!response.ok) {
			const retryAfter = response.headers.get('retry-after');
			const reset = response.headers.get('x-ratelimit-reset');
			const hint = retryAfter ? ` Retry after ${retryAfter}s.` : reset ? ` Rate limit reset (Unix): ${reset}.` : '';
			throw new Error(`GitHub search for ${id} returned HTTP ${response.status}.${hint}`);
		}
		const result: unknown = await response.json();
		if (!isRecord(result) || !Array.isArray(result.items) || typeof result.incomplete_results !== 'boolean') {
			throw new Error(`GitHub returned an invalid search response for ${id}.`);
		}
		if (result.incomplete_results) throw new Error(`GitHub returned incomplete search results for ${id}.`);

		const fetchedAt = new Date().toISOString();
		const repositoryIds = new Set<number>();
		for (const item of result.items) {
			const repository = parseRepository(item, fetchedAt);
			snapshot.repositories[repository.id] = repository;
			repositoryIds.add(repository.id);
		}
		snapshot.collections.push({
			id,
			kind,
			query: searchQuery,
			sort,
			order: 'desc',
			per_page: REPOSITORIES_PER_COLLECTION,
			total_count: countOrNull(result.total_count),
			fetched_at: fetchedAt,
			repository_ids: [...repositoryIds],
		});
	}

	if (Object.keys(snapshot.repositories).length === 0) throw new Error('GitHub returned no repository candidates.');
	return snapshot;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const booleanOrNull = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
const countOrNull = (value: unknown): number | null => (isCount(value) ? value : null);

const parseOwner = (value: unknown): RepositoryOwner | null => {
	if (!isRecord(value)) return null;
	return {
		id: countOrNull(value.id),
		login: stringOrNull(value.login),
		type: stringOrNull(value.type),
		avatar_url: stringOrNull(value.avatar_url),
		html_url: stringOrNull(value.html_url),
	};
};

const parseLicense = (value: unknown): RepositoryLicense | null => {
	if (!isRecord(value)) return null;
	return {
		key: stringOrNull(value.key),
		name: stringOrNull(value.name),
		spdx_id: stringOrNull(value.spdx_id),
	};
};

const parseRepository = (value: unknown, fetchedAt: string): Repository => {
	// Only identity is required to index a repository and link it to collections.
	if (
		!isRecord(value) ||
		!isCount(value.id) ||
		value.id === 0 ||
		typeof value.full_name !== 'string' ||
		!value.full_name.trim()
	) {
		throw new Error('GitHub returned invalid repository identity.');
	}
	return {
		id: value.id,
		node_id: stringOrNull(value.node_id),
		full_name: value.full_name,
		owner: parseOwner(value.owner),
		html_url: stringOrNull(value.html_url) || `https://github.com/${value.full_name}`,
		description: stringOrNull(value.description),
		homepage: stringOrNull(value.homepage),
		default_branch: stringOrNull(value.default_branch),
		language: stringOrNull(value.language),
		topics: Array.isArray(value.topics)
			? value.topics.filter((topic): topic is string => typeof topic === 'string')
			: null,
		license: parseLicense(value.license),
		stargazers_count: countOrNull(value.stargazers_count),
		forks_count: countOrNull(value.forks_count),
		open_issues_count: countOrNull(value.open_issues_count),
		size: countOrNull(value.size),
		archived: booleanOrNull(value.archived),
		disabled: booleanOrNull(value.disabled),
		is_template: booleanOrNull(value.is_template),
		allow_forking: booleanOrNull(value.allow_forking),
		has_issues: booleanOrNull(value.has_issues),
		has_discussions: booleanOrNull(value.has_discussions),
		has_wiki: booleanOrNull(value.has_wiki),
		has_pages: booleanOrNull(value.has_pages),
		created_at: stringOrNull(value.created_at),
		updated_at: stringOrNull(value.updated_at),
		pushed_at: stringOrNull(value.pushed_at),
		fetched_at: fetchedAt,
	};
};
