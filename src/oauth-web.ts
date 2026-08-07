import { getOAuthBroadcastChannelName } from './oauth-common';

interface OAuthResultMessage {
	type: 'authorizing';
	payload: Record<string, unknown>;
	state: string;
}

export const createOAuthState = () => {
	const bytes = new Uint8Array(16);
	window.crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const isOAuthResultMessage = (data: unknown, state: string): data is OAuthResultMessage => {
	if (!data || typeof data !== 'object') {
		return false;
	}
	const message = data as Partial<OAuthResultMessage>;
	return (
		message.type === 'authorizing' &&
		message.state === state &&
		message.payload !== null &&
		typeof message.payload === 'object'
	);
};

export const waitForOAuthResult = (
	state: string,
	opener: Window | null,
	timeoutMs = 300 * 1000,
): Promise<Record<string, unknown>> => {
	const channel =
		typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(getOAuthBroadcastChannelName(state));

	return new Promise((resolve) => {
		let settled = false;

		const cleanup = () => {
			window.removeEventListener('message', handleWindowMessage);
			channel?.removeEventListener('message', handleBroadcastMessage);
			channel?.close();
			window.clearTimeout(timeoutId);
		};

		const finish = (data: unknown) => {
			if (settled || !isOAuthResultMessage(data, state)) {
				return;
			}
			settled = true;
			cleanup();
			resolve(data.payload);
		};

		const handleBroadcastMessage = (event: MessageEvent) => finish(event.data);
		const handleWindowMessage = (event: MessageEvent) => {
			if (!opener || event.source !== opener || event.origin !== location.origin) {
				return;
			}
			finish(event.data);
		};

		channel?.addEventListener('message', handleBroadcastMessage);
		window.addEventListener('message', handleWindowMessage);
		const timeoutId = window.setTimeout(() => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			resolve({ error: 'authorizing_timeout', error_description: 'Authorizing timeout' });
		}, timeoutMs);
	});
};
