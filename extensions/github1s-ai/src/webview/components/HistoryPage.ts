import { html } from 'htm/preact';
import { useEffect, useState } from 'preact/hooks';

import type { ViewEvent, ViewState } from '@/common/protocol';

import { formatConversationTime, presentConversationUsage } from '../helpers/presentation';
import { Icon } from './Icon';
import { PageHeader } from './PageHeader';

interface HistoryPageProps {
	state: ViewState;
	post: (event: ViewEvent) => void;
}

const RELATIVE_TIME_REFRESH_INTERVAL_MS = 60_000;

export const HistoryPage = ({ state, post }: HistoryPageProps) => {
	const [confirmingId, setConfirmingId] = useState<string>();
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), RELATIVE_TIME_REFRESH_INTERVAL_MS);
		return () => window.clearInterval(timer);
	}, []);
	const conversations = [...state.conversations].sort((left, right) => right.updatedAt - left.updatedAt);

	return html`<section class="history-page" aria-label="History">
		<${PageHeader} title="History" backLabel="Back to chat" onBack=${() => post({ type: 'app.openChat' })} />
		${state.runtime.history.notice
			? html`<p class="notice" role="status" aria-live="polite">${state.runtime.history.notice.message}</p>`
			: null}
		${conversations.length === 0
			? html`<p class="history-empty">Your conversations will appear here after you send the first question.</p>`
			: html`<div class="history-list">
					${conversations.map((conversation) => {
						const title = conversation.title;
						const isActive = conversation.id === state.runtime.chat.conversation?.id;
						const time = formatConversationTime(conversation.updatedAt, now);
						const usage = presentConversationUsage(conversation.usage);
						const deleteLabel = `Delete ${title}`;
						return html`<article
							key=${conversation.id}
							class=${isActive ? 'history-row history-row-active' : 'history-row'}
						>
							<button
								class="history-main"
								type="button"
								title=${title}
								aria-current=${isActive ? 'true' : undefined}
								onClick=${() => post({ type: 'history.selectConversation', id: conversation.id })}
							>
								<span class="history-title">${title}</span>
								<span class="history-meta">
									<time datetime=${time.dateTime} title=${time.title}>${time.relativeTime}</time>
									${usage ? html`<span class="history-usage" title=${usage.title}>${usage.value} tokens</span>` : null}
								</span>
							</button>
							${confirmingId === conversation.id
								? html`<div class="history-confirm" role="group" aria-label=${`Delete ${title}?`}>
										<button class="ghost-button" type="button" onClick=${() => setConfirmingId(undefined)}>
											Cancel
										</button>
										<button
											class="ghost-button history-confirm-delete"
											type="button"
											onClick=${() => {
												post({ type: 'history.deleteConversation', id: conversation.id });
												setConfirmingId(undefined);
											}}
										>
											Delete
										</button>
									</div>`
								: html`<button
										class="icon-button history-delete"
										type="button"
										aria-label=${deleteLabel}
										title=${deleteLabel}
										onClick=${() => setConfirmingId(conversation.id)}
									>
										<${Icon} name="trash" />
									</button>`}
						</article>`;
					})}
				</div>`}
	</section>`;
};
