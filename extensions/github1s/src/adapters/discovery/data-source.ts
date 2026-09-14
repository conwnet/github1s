import { getBrowserUrl } from '@/helpers/context';
import { decorate, memorize } from '@/helpers/func';
import { DataSource, Directory, File, FileType } from '../types';
import { createDiscoveryPages } from './templates';
import type { DiscoverySnapshot } from './types';

export class DiscoveryDataSource extends DataSource {
	private readonly encoder = new TextEncoder();

	@decorate(memorize)
	private async getPages() {
		const response = await fetch('https://discovery.github1s.com/github/latest.json', {
			signal: AbortSignal.timeout(15000),
		});
		if (!response.ok) {
			throw new Error(`Unable to load Discovery: HTTP ${response.status}.`);
		}
		const snapshot: DiscoverySnapshot = await response.json();
		if (
			!Array.isArray(snapshot.collections) ||
			!snapshot.collections.every((collection) => collection?.kind === 'topic' || collection?.kind === 'curated') ||
			!snapshot.repositories ||
			typeof snapshot.repositories !== 'object' ||
			!Number.isFinite(Date.parse(snapshot.generated_at))
		) {
			throw new Error('Unable to load Discovery: invalid snapshot.');
		}
		return getBrowserUrl().then((browserUrl: string) => createDiscoveryPages(snapshot, new URL(browserUrl).origin));
	}

	async provideDirectory(repo: string, ref: string, path: string, recursive = false): Promise<Directory | null> {
		const prefix = path.replace(/\/+$/, '') + '/';
		if (prefix !== '/' && prefix !== '/topics/') {
			return null;
		}
		const entries: Directory['entries'] = prefix === '/' ? [{ path: '/topics', type: FileType.Directory }] : [];
		for (const filePath of (await this.getPages()).keys()) {
			if (filePath.startsWith(prefix) && (recursive || !filePath.slice(prefix.length).includes('/'))) {
				entries.push({ path: filePath, type: FileType.File });
			}
		}
		return { truncated: false, entries };
	}

	async provideFile(repo: string, ref: string, path: string): Promise<File | null> {
		const render = (await this.getPages()).get(path);
		return render ? { content: this.encoder.encode(render()) } : null;
	}
}
