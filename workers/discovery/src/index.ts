import { generateDiscovery } from './generate.ts';
import { LATEST_KEY, saveSnapshot } from './snapshots.ts';

export interface Env {
	DISCOVERY_KV: Pick<KVNamespace, 'get' | 'put'>;
	GITHUB_TOKEN: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const headers = new Headers({ 'Access-Control-Allow-Origin': '*' });
		if (new URL(request.url).pathname !== '/github/latest.json') {
			return new Response('Not found', { status: 404, headers });
		}
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			headers.set('Allow', 'GET, HEAD');
			return new Response('Method not allowed', { status: 405, headers });
		}
		try {
			const json = await env.DISCOVERY_KV.get(LATEST_KEY);
			if (json === null) {
				return new Response(request.method === 'HEAD' ? null : 'Snapshot not available', { status: 404, headers });
			}
			headers.set('Content-Type', 'application/json; charset=utf-8');
			headers.set('Cache-Control', 'public, max-age=3600');
			return new Response(request.method === 'HEAD' ? null : json, { headers });
		} catch (error) {
			console.error('Unable to read discovery snapshot.', error);
			return new Response(request.method === 'HEAD' ? null : 'Snapshot temporarily unavailable', {
				status: 503,
				headers,
			});
		}
	},

	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		const snapshot = await generateDiscovery({ token: env.GITHUB_TOKEN, onProgress: console.log });
		await saveSnapshot(env.DISCOVERY_KV, snapshot, controller.scheduledTime);
		console.log(`Published discovery snapshot ${snapshot.generated_at}.`);
	},
} satisfies ExportedHandler<Env>;
