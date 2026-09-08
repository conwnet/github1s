import { html } from 'htm/preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

import type { ConversationMessage } from '@/common/conversation';
import type { ViewRequest, ViewState } from '@/common/protocol';
import { QUICK_ACTIONS } from '@/common/quick-actions';

import { Composer } from './Composer';
import { Icon } from './Icon';
import { MessageView } from './MessageView';

interface ChatContextProps {
	state: ViewState;
	post: (request: ViewRequest) => void;
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
	const busy =
		state.runtime.chat.preparing === true || messages.some(({ metadata }) => metadata.status === 'streaming');
	const notice = state.runtime.chat.notice?.message;

	return html`
		${notice ? html`<p class="notice" role="status" aria-live="polite">${notice}</p>` : null}
		<${Transcript} state=${state} messages=${messages} busy=${busy} post=${post} />
		${state.modelConfigs.configs.length > 0
			? html`<${Composer} key=${conversationId ?? 'new'} state=${state} busy=${busy} active=${active} post=${post} />`
			: null}
	`;
};

interface ChatContentProps extends ChatContextProps {
	busy: boolean;
}

interface TranscriptProps extends ChatContentProps {
	messages: readonly ConversationMessage[];
}

const Transcript = ({ state, messages, busy, post }: TranscriptProps) => {
	const transcript = useRef<HTMLElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const followOutput = useRef(true);

	useLayoutEffect(() => {
		const element = transcript.current;
		if (element && followOutput.current) scrollToBottom(element);
	}, [messages]);

	useLayoutEffect(() => {
		const element = transcript.current;
		const contentElement = content.current;
		if (!element || !contentElement || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => {
			if (followOutput.current) scrollToBottom(element);
		});
		observer.observe(contentElement);
		return () => observer.disconnect();
	}, []);

	const onScroll = () => {
		const element = transcript.current;
		if (element) {
			followOutput.current = element.scrollHeight - element.scrollTop - element.clientHeight <= FOLLOW_OUTPUT_THRESHOLD;
		}
	};

	return html`<section ref=${transcript} class="transcript" aria-label="Conversation" onScroll=${onScroll}>
		<div ref=${content} class="transcript-content">
			${messages.length === 0
				? html`<${EmptyChat} state=${state} busy=${busy} post=${post} />`
				: messages.map((message) => html`<${MessageView} key=${message.id} message=${message} post=${post} />`)}
		</div>
	</section>`;
};

const scrollToBottom = (element: HTMLElement): void => {
	element.scrollTop = element.scrollHeight;
};

const EmptyChat = ({ state, busy, post }: ChatContentProps) => {
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
		<${QuickActions} state=${state} busy=${busy} post=${post} />
	</div>`;
};

const QuickActions = ({ state, busy, post }: ChatContentProps) => {
	const chat = state.runtime.chat;
	return html`<div class="quick-actions" role="group" aria-label="Quick Actions">
		${QUICK_ACTIONS.map((item) => {
			const available = item.attachment === undefined || chat[item.attachment] !== undefined;
			return html`<button
				key=${item.action}
				class="quick-action"
				type="button"
				disabled=${busy || !available}
				onClick=${() => post({ type: 'chat.runQuickAction', action: item.action })}
			>
				<${Icon} name=${item.icon} />
				<span class="quick-action-copy"><strong>${item.title}</strong><span>${item.description}</span></span>
			</button>`;
		})}
	</div>`;
};
