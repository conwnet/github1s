import type { DiscoveryCollection, DiscoverySnapshot, Repository } from './types';

interface CollectionPresentation {
	title: string;
	description: string;
	icon: string;
}

// Page copy can change independently of persisted collection snapshots.
const curatedPresentations: Record<string, CollectionPresentation> = {
	'new-projects': {
		title: 'New Projects',
		description: 'Recently created repositories.',
		icon: '🌱',
	},
	'hidden-gems': {
		title: 'Hidden Gems',
		description: 'Lesser-known repositories with recent development activity.',
		icon: '💎',
	},
	'most-starred': {
		title: 'Most Starred',
		description: 'Repositories with the highest total star counts on GitHub.',
		icon: '⭐',
	},
};

const getCollectionPresentation = ({ id, kind }: DiscoveryCollection): CollectionPresentation => {
	if (kind === 'topic') {
		return { title: id, description: `Repositories tagged ${id} on GitHub.`, icon: '🏷️' };
	}
	if (Object.prototype.hasOwnProperty.call(curatedPresentations, id)) {
		return curatedPresentations[id];
	}
	return { title: id, description: 'A curated selection of GitHub repositories.', icon: '📚' };
};

// Repository descriptions are plain text, even when they contain Markdown or HTML.
const escapeText = (text: string) =>
	text
		.replace(/\s+/g, ' ')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/[\\`*_{}[\]()#+.!|~-]/g, '\\$&');

const formatCount = (count: number) => count.toLocaleString('en-US');
const collectionPath = (collection: DiscoveryCollection) =>
	`/${collection.kind === 'topic' ? 'topics/' : ''}${collection.id}.md`;
const collectionLink = (collection: DiscoveryCollection) =>
	`[${escapeText(getCollectionPresentation(collection).title)}](${collectionPath(collection)})`;
const homeLink = '[← Discovery](/README.md)';

// Keep content in Markdown; use CSS for typography and section boundaries.
const renderPage = (content: string) => `<style>
body { max-width: 900px; margin: 0 auto; }
h2:has(a), h3:has(a) { margin-bottom: 8px; padding-bottom: 0; border: 0; }
small { color: var(--vscode-descriptionForeground); }
hr.section-break { height: 0; margin: 36px 0 28px; border: 0; border-top: 3px double var(--vscode-descriptionForeground); }
</style>

${content}
`;

const getRepositories = (snapshot: DiscoverySnapshot, collection: DiscoveryCollection): Repository[] =>
	collection.repository_ids.map((id) => snapshot.repositories[id]).filter((repo): repo is Repository => !!repo);
const renderUpdatedAt = (snapshot: DiscoverySnapshot) =>
	`Updated ${new Date(snapshot.generated_at).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const renderMeta = (text: string) => `<small>${text}</small>`;

const renderRepository = (repo: Repository, origin: string, heading: '##' | '###') => {
	const path = repo.full_name.split('/').map(encodeURIComponent).join('/');
	const metadata = [
		repo.language && `**${escapeText(repo.language)}**`,
		repo.stargazers_count !== null &&
			`★ ${formatCount(repo.stargazers_count)} ${repo.stargazers_count === 1 ? 'star' : 'stars'}`,
		repo.forks_count !== null && `${formatCount(repo.forks_count)} ${repo.forks_count === 1 ? 'fork' : 'forks'}`,
		repo.pushed_at && `Last push: ${escapeText(repo.pushed_at.slice(0, 10))}`,
		`[GitHub ↗](https://github.com/${path})`,
	].filter(Boolean);
	return `${heading} [${escapeText(repo.full_name)}](${origin}/${path})

${repo.description ? escapeText(repo.description) : 'No description provided.'}  
${renderMeta(metadata.join(' · '))}`;
};

const renderRepositoryList = (repos: Repository[], origin: string, heading: '##' | '###') =>
	repos.map((repo) => renderRepository(repo, origin, heading)).join('\n\n---\n\n') ||
	'No repositories available in this collection.';

const renderCollectionPreview = (snapshot: DiscoverySnapshot, collection: DiscoveryCollection, origin: string) => {
	const { title, description, icon } = getCollectionPresentation(collection);
	const repos = getRepositories(snapshot, collection);
	return `<hr class="section-break">

## ${icon} ${escapeText(title)}

${escapeText(description)}

${renderRepositoryList(repos.slice(0, 3), origin, '###')}

[View ${escapeText(title)} →](${collectionPath(collection)}) · ${formatCount(repos.length)} repositories`;
};

const renderHome = (snapshot: DiscoverySnapshot, origin: string) => {
	const curated = snapshot.collections.filter((collection) => collection.kind === 'curated');
	const topics = snapshot.collections.filter((collection) => collection.kind === 'topic');
	const sections = curated.map((collection) => renderCollectionPreview(snapshot, collection, origin));
	return renderPage(`# GitHub1s Discovery

Discover GitHub projects and explore their source code in your browser.

${renderMeta(`${formatCount(Object.keys(snapshot.repositories).length)} repositories · ${renderUpdatedAt(snapshot)}`)}

${topics.map(collectionLink).join(' | ')}

${sections.join('\n\n') || 'No collections available.'}

---

${renderMeta('Source: GitHub Search. Star and fork counts reflect the values at the time of collection.')}`);
};

const renderCollection = (snapshot: DiscoverySnapshot, collection: DiscoveryCollection, origin: string) => {
	const { title, description, icon } = getCollectionPresentation(collection);
	const repos = getRepositories(snapshot, collection);
	const sort = collection.sort === 'stars' ? 'Stars, descending' : 'Recently updated first';
	return renderPage(`${homeLink}

# ${icon} ${escapeText(title)}

${escapeText(description)}

${renderMeta(`${formatCount(repos.length)} repositories · Sort: ${sort} · ${renderUpdatedAt(snapshot)}`)}

${renderRepositoryList(repos, origin, '##')}

---

${homeLink}`);
};

export const createDiscoveryPages = (snapshot: DiscoverySnapshot, origin: string): Map<string, () => string> => {
	const pages = new Map<string, () => string>([['/README.md', () => renderHome(snapshot, origin)]]);
	for (const collection of snapshot.collections) {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collection.id)) {
			throw new Error(`Invalid Discovery collection ID: ${collection.id}`);
		}
		pages.set(collectionPath(collection), () => renderCollection(snapshot, collection, origin));
	}
	return pages;
};
