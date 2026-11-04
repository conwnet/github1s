import { html } from 'htm/preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

import type { ConversationMessage } from '@/common/conversation';
import type { ViewEvent, ViewState } from '@/common/protocol';
import { QUICK_ACTIONS } from '@/common/quick-actions';

import { Composer } from './Composer';
import { Icon } from './Icon';
import { MessageView } from './MessageView';

interface ChatContextProps {
	state: ViewState;
	post: (event: ViewEvent) => void;
}

interface ChatPageProps extends ChatContextProps {
	active: boolean;
}

const EMPTY_MESSAGES: readonly ConversationMessage[] = [];
const FOLLOW_OUTPUT_THRESHOLD = 48;

export const ChatPage = ({ state, active, post }: ChatPageProps) => {
	const conversation = state.runtime.chat.conversation;
	const conversationId = conversation?.id;
	const messages = conversation?.messages ?? EMPTY_MESSAGES;
	const notice = state.runtime.chat.notice;
	const editingId = state.runtime.chat.editing?.messageId;

	return html`
		${notice && !editingId
			? html`<p class=${`notice notice-${notice.severity}`} role="status" aria-live="polite">
					${notice.severity === 'success' ? html`<${Icon} name="check" />` : null} ${notice.message}
				</p>`
			: null}
		<${Transcript} state=${state} messages=${messages} active=${active} post=${post} />
		${state.modelConfigs.configs.length > 0
			? html`<${Composer} key=${conversationId ?? 'new'} state=${state} active=${active && !editingId} post=${post} />`
			: null}
	`;
};

interface TranscriptProps extends ChatContextProps {
	messages: readonly ConversationMessage[];
	active: boolean;
}

const Transcript = ({ state, messages, active, post }: TranscriptProps) => {
	const editingId = state.runtime.chat.editing?.messageId;
	const lastMessageBeforeEditing = useRef<string>();
	const transcript = useRef<HTMLElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const followOutput = useRef(true);

	useLayoutEffect(() => {
		const lastMessageId = messages.at(-1)?.id;
		if (editingId) {
			lastMessageBeforeEditing.current = lastMessageId;
			return;
		}
		if (lastMessageBeforeEditing.current && lastMessageBeforeEditing.current !== lastMessageId) {
			followOutput.current = true;
		}
		lastMessageBeforeEditing.current = undefined;
		const element = transcript.current;
		if (element && followOutput.current) scrollToBottom(element);
	}, [messages, editingId]);

	useLayoutEffect(() => {
		if (editingId) return;
		const element = transcript.current;
		const contentElement = content.current;
		if (!element || !contentElement || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => {
			if (followOutput.current) scrollToBottom(element);
		});
		observer.observe(contentElement);
		return () => observer.disconnect();
	}, [editingId]);

	const onScroll = () => {
		const element = transcript.current;
		if (element) {
			followOutput.current = element.scrollHeight - element.scrollTop - element.clientHeight <= FOLLOW_OUTPUT_THRESHOLD;
		}
	};

	return html`<section ref=${transcript} class="transcript" aria-label="Conversation" onScroll=${onScroll}>
		<div ref=${content} class="transcript-content">
			${messages.length === 0
				? html`<${EmptyChat} state=${state} post=${post} />`
				: messages.map((message) =>
						message.id === editingId
							? html`<article key=${message.id} class="message message-editing">
									<${Composer} state=${state} active=${active} post=${post} message=${message} />
								</article>`
							: html`<${MessageView}
									key=${message.id}
									message=${message}
									busy=${state.chatPhase !== 'idle'}
									hasModel=${state.modelConfigs.configs.length > 0}
									inactive=${Boolean(editingId)}
									post=${post}
								/>`,
					)}
		</div>
	</section>`;
};

const scrollToBottom = (element: HTMLElement): void => {
	element.scrollTop = element.scrollHeight;
};

const EmptyChat = ({ state, post }: ChatContextProps) => {
	if (state.modelConfigs.configs.length === 0) {
		return html`<div class="empty-state">
			<h2>Set up GitHub1s AI</h2>
			<p>Configure a model to ask questions about this repository.</p>
			<button class="primary" type="button" onClick=${() => post({ type: 'app.openSettings' })}>Open settings</button>
		</div>`;
	}

	return html`<div class="empty-state">
		<h2>Ask about this repository</h2>
		<p>Choose a quick action or ask a question below.</p>
		<${QuickActions} state=${state} post=${post} />
	</div>`;
};

const QuickActions = ({ state, post }: ChatContextProps) => {
	const chat = state.runtime.chat;
	return html`<div class="quick-actions" role="group" aria-label="Quick Actions">
		${QUICK_ACTIONS.map((item) => {
			const available = item.attachment === undefined || chat[item.attachment] !== undefined;
			return html`<button
				key=${item.action}
				class="quick-action"
				type="button"
				disabled=${state.chatPhase !== 'idle' || !available}
				onClick=${() => post({ type: 'chat.runQuickAction', action: item.action })}
			>
				<${Icon} name=${item.icon} />
				<span class="quick-action-copy"><strong>${item.title}</strong><span>${item.description}</span></span>
			</button>`;
		})}
	</div>`;
};
