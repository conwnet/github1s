import { html } from 'htm/preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

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
	const [rowAction, setRowAction] = useState<{ id: string; type: 'edit' | 'delete' }>();
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
						const action = rowAction?.id === conversation.id ? rowAction.type : undefined;
						const time = formatConversationTime(conversation.updatedAt, now);
						const usage = presentConversationUsage(conversation.usage);
						const editLabel = `Edit ${title}`;
						const deleteLabel = `Delete ${title}`;
						return html`<article
							key=${conversation.id}
							class=${isActive ? 'history-row history-row-active' : 'history-row'}
						>
							${action === 'edit'
								? html`<${HistoryTitleEditor}
										title=${title}
										onSave=${(title: string) =>
											post({ type: 'history.renameConversation', id: conversation.id, title })}
										onCancel=${() => setRowAction(undefined)}
									/>`
								: html`<button
										class="history-main"
										type="button"
										title=${title}
										aria-current=${isActive ? 'true' : undefined}
										onClick=${() => post({ type: 'history.selectConversation', id: conversation.id })}
									>
										<span class="history-title">${title}</span>
										<span class="history-meta">
											<time datetime=${time.dateTime} title=${time.title}>${time.relativeTime}</time>
											${usage
												? html`<span class="history-usage" title=${usage.title}>${usage.value} tokens</span>`
												: null}
										</span>
									</button>`}
							${action === 'edit'
								? null
								: action === 'delete'
									? html`<div class="history-confirm" role="group" aria-label=${`Delete ${title}?`}>
											<button class="ghost-button" type="button" onClick=${() => setRowAction(undefined)}>
												Cancel
											</button>
											<button
												class="ghost-button history-confirm-delete"
												type="button"
												onClick=${() => {
													post({ type: 'history.deleteConversation', id: conversation.id });
													setRowAction(undefined);
												}}
											>
												Delete
											</button>
										</div>`
									: html`<div class="history-actions">
											<button
												class="icon-button"
												type="button"
												aria-label=${editLabel}
												title=${editLabel}
												onClick=${() => setRowAction({ id: conversation.id, type: 'edit' })}
											>
												<${Icon} name="edit" />
											</button>
											<button
												class="icon-button"
												type="button"
												aria-label=${deleteLabel}
												title=${deleteLabel}
												onClick=${() => setRowAction({ id: conversation.id, type: 'delete' })}
											>
												<${Icon} name="trash" />
											</button>
										</div>`}
						</article>`;
					})}
				</div>`}
	</section>`;
};

interface HistoryTitleEditorProps {
	title: string;
	onSave: (title: string) => void;
	onCancel: () => void;
}

const HistoryTitleEditor = ({ title, onSave, onCancel }: HistoryTitleEditorProps) => {
	const [draft, setDraft] = useState(title);
	const [submittedTitle, setSubmittedTitle] = useState<string>();
	const input = useRef<HTMLInputElement>(null);
	const nextTitle = draft.trim();

	useLayoutEffect(() => {
		input.current?.focus();
		input.current?.select();
	}, []);

	useEffect(() => {
		if (submittedTitle !== title) return;
		setSubmittedTitle(undefined);
		if (nextTitle === title) onCancel();
	}, [title, submittedTitle, nextTitle, onCancel]);

	return html`<form
		class="history-title-editor"
		onSubmit=${(event: SubmitEvent) => {
			event.preventDefault();
			if (!nextTitle) return;
			if (nextTitle === title && submittedTitle === undefined) {
				onCancel();
				return;
			}
			setSubmittedTitle(nextTitle);
			onSave(nextTitle);
		}}
		onKeyDown=${(event: KeyboardEvent) => {
			if (event.isComposing || event.keyCode === 229) {
				if (event.key === 'Enter') event.preventDefault();
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				onCancel();
			}
		}}
	>
		<input
			ref=${input}
			class="history-title-input"
			type="text"
			aria-label="Conversation title"
			value=${draft}
			required
			autocomplete="off"
			onInput=${(event: InputEvent) => setDraft((event.currentTarget as HTMLInputElement).value)}
		/>
		<div class="history-actions">
			<button class="icon-button" type="submit" aria-label="Save title" title="Save title" disabled=${!nextTitle}>
				<${Icon} name="check" />
			</button>
			<button class="icon-button" type="button" aria-label="Cancel editing" title="Cancel editing" onClick=${onCancel}>
				<${Icon} name="close" />
			</button>
		</div>
	</form>`;
};
