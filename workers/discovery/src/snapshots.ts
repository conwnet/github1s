import type { DiscoverySnapshot } from './types.ts';

export const LATEST_KEY = 'latest';
export const SNAPSHOT_RETENTION_SECONDS = 90 * 24 * 60 * 60;

// Use the scheduled UTC date so execution delays cannot change the archive day.
export const getHistoryKey = (scheduledTime: number): string =>
	`history:${new Date(scheduledTime).toISOString().slice(0, 10)}`;

export const saveSnapshot = async (
	kv: Pick<KVNamespace, 'put'>,
	snapshot: DiscoverySnapshot,
	scheduledTime = Date.parse(snapshot.generated_at),
): Promise<void> => {
	const expiration = Math.floor(Date.parse(snapshot.generated_at) / 1000) + SNAPSHOT_RETENTION_SECONDS;
	const json = JSON.stringify(snapshot);
	// Reruns replace the same day. KV uses last-write-wins, not conditional creation.
	await kv.put(getHistoryKey(scheduledTime), json, { expiration });
	// Preserve the previous latest snapshot if collection or archival fails.
	// Latest also expires so a stopped collector cannot retain data past 90 days.
	await kv.put(LATEST_KEY, json, { expiration });
};
