export interface RepositoryOwner {
	id: number | null;
	login: string | null;
	type: string | null;
	avatar_url: string | null;
	html_url: string | null;
}

export interface RepositoryLicense {
	key: string | null;
	name: string | null;
	spdx_id: string | null;
}

// Select public metadata for discovery, filtering, and historical comparisons.
export interface Repository {
	id: number;
	node_id: string | null;
	full_name: string;
	owner: RepositoryOwner | null;
	html_url: string;
	description: string | null;
	homepage: string | null;
	default_branch: string | null;
	language: string | null;
	// Missing metadata stays unknown instead of becoming zero, an empty list, or false.
	topics: string[] | null;
	license: RepositoryLicense | null;
	stargazers_count: number | null;
	forks_count: number | null;
	// GitHub includes both issues and pull requests in this count.
	open_issues_count: number | null;
	// Repository size in KB, not source lines or working-tree size.
	size: number | null;
	archived: boolean | null;
	disabled: boolean | null;
	is_template: boolean | null;
	allow_forking: boolean | null;
	has_issues: boolean | null;
	has_discussions: boolean | null;
	has_wiki: boolean | null;
	has_pages: boolean | null;
	created_at: string | null;
	updated_at: string | null;
	pushed_at: string | null;
	// Local observation time for these counts, not a GitHub activity timestamp.
	fetched_at: string;
}

export interface DiscoveryCollection {
	id: string;
	kind: 'topic' | 'curated';
	query: string;
	sort: 'stars' | 'updated';
	order: 'desc';
	per_page: number;
	total_count: number | null;
	fetched_at: string;
	repository_ids: number[];
}

export interface DiscoverySnapshot {
	generated_at: string;
	// JSON object keys are GitHub repository IDs, shared by all collections.
	repositories: Record<string, Repository>;
	collections: DiscoveryCollection[];
}
