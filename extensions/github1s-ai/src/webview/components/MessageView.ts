import { html } from 'htm/preact';

import type { ConversationMessage } from '@/common/conversation';

import type { PostMarkdownHighlightRequest } from '../helpers/highlighting';
import { messageStatusLabel } from '../helpers/presentation';
import { AssistantActivity, isAssistantActivityPart, type AssistantActivityPart } from './AssistantActivity';
import { AttachmentChips } from './AttachmentChips';
import { Markdown } from './Markdown';

type AssistantSegment =
	| { type: 'activity'; key: string; parts: AssistantActivityPart[]; followedByText: boolean }
	| { type: 'text'; key: string; text: string };

interface MessageViewProps {
	message: ConversationMessage;
	post: PostMarkdownHighlightRequest;
}

export const MessageView = ({ message, post }: MessageViewProps) => {
	if (message.role !== 'user' && message.role !== 'assistant') return null;
	const segments = message.role === 'assistant' ? assistantSegments(message) : [];
	const activityRunning = segments.some(
		(segment) => segment.type === 'activity' && message.metadata.status === 'streaming' && !segment.followedByText,
	);
	const status = activityRunning ? undefined : messageStatusLabel(message.metadata);

	return html`<article class=${`message message-${message.role}`}>
		${message.role === 'user'
			? html`<div class="user-request">
					<div class="user-content">${messageText(message)}</div>
					<${AttachmentChips} attachments=${messageAttachments(message)} />
				</div>`
			: html`<div class="assistant-response">
					${segments.map((segment) =>
						segment.type === 'text'
							? html`<${Markdown} key=${segment.key} source=${segment.text} post=${post} />`
							: html`<${AssistantActivity}
									key=${segment.key}
									parts=${segment.parts}
									messageStatus=${message.metadata.status}
									active=${message.metadata.status === 'streaming' && !segment.followedByText}
									post=${post}
								/>`,
					)}
				</div>`}
		${status ? html`<${MessageStatus} label=${status} generating=${message.metadata.status === 'streaming'} />` : null}
		${message.metadata.error ? html`<p class="turn-error" role="alert">${message.metadata.error}</p>` : null}
	</article>`;
};

const MessageStatus = ({ label, generating }: { label: string; generating: boolean }) => {
	if (!generating) return html`<p class="message-status" role="status">${label}</p>`;
	return html`<p class="message-status message-status-generating" role="status" aria-label="Generating response">
		<span>Generating</span>
		<span class="generating-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
	</p>`;
};

const assistantSegments = (message: ConversationMessage): AssistantSegment[] => {
	const segments: AssistantSegment[] = [];
	let activityParts: AssistantActivityPart[] = [];
	let activityStart = 0;

	const flushActivity = (followedByText: boolean) => {
		if (activityParts.length === 0) return;
		segments.push({
			type: 'activity',
			key: `${message.id}-activity-${activityStart}`,
			parts: activityParts,
			followedByText,
		});
		activityParts = [];
	};

	message.parts.forEach((part, index) => {
		if (isAssistantActivityPart(part)) {
			if (activityParts.length === 0) activityStart = index;
			activityParts.push(part);
			return;
		}
		if (part.type !== 'text') return;
		flushActivity(true);
		if (part.text) segments.push({ type: 'text', key: `${message.id}-text-${index}`, text: part.text });
	});
	flushActivity(false);

	return segments;
};

const messageText = (message: ConversationMessage): string =>
	message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');

const messageAttachments = (message: ConversationMessage) =>
	message.parts.flatMap((part) => (part.type === 'data-attachments' ? part.data : []));
