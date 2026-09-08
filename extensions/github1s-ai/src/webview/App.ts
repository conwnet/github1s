import { html } from 'htm/preact';
import { useEffect, useState } from 'preact/hooks';

import type { ViewMessage, ViewRequest, ViewState } from '@/common/protocol';

import { ChatPage } from './components/ChatPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';

interface AppProps {
	post: (request: ViewRequest) => void;
}

export const App = ({ post }: AppProps) => {
	const state = useViewState(post);
	if (!state) return html`<${InitialLoading} />`;
	const page = state.runtime.page;

	return html`<main class="chat-app">
		<div class="chat-page" hidden=${page !== 'chat'}>
			<${ChatPage} state=${state} active=${page === 'chat'} post=${post} />
		</div>
		${page === 'history'
			? html`<${HistoryPage} state=${state} post=${post} />`
			: page === 'settings'
				? html`<${SettingsPage} state=${state} post=${post} />`
				: null}
	</main>`;
};

const InitialLoading = () =>
	html`<main class="chat-app app-loading-shell" aria-busy="true">
		<div class="app-loading" role="status">
			<span class="app-loading-label">Loading GitHub1s AI…</span>
			<div class="app-loading-bars" aria-hidden="true">
				<span></span><span></span><span></span><span></span><span></span>
			</div>
		</div>
	</main>`;

const useViewState = (post: AppProps['post']): ViewState | undefined => {
	const [state, setState] = useState<ViewState>();

	useEffect(() => {
		const receive = (event: MessageEvent<unknown>) => {
			if (isViewStateMessage(event.data)) setState(event.data.state);
		};
		window.addEventListener('message', receive);
		post({ type: 'app.ready' });
		return () => window.removeEventListener('message', receive);
	}, [post]);

	return state;
};

const isViewStateMessage = (value: unknown): value is Extract<ViewMessage, { type: 'app.setState' }> => {
	if (typeof value !== 'object' || value === null) return false;
	const message = value as { type?: unknown; state?: unknown };
	return message.type === 'app.setState' && typeof message.state === 'object' && message.state !== null;
};
