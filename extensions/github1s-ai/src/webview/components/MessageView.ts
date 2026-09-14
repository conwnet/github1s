import { html } from 'htm/preact';

import type { ConversationMessage } from '@/common/conversation';
import type { ViewEvent } from '@/common/protocol';

import { messageStatusLabel } from '../helpers/presentation';
import { AssistantActivity, isAssistantActivityPart, type AssistantActivityPart } from './AssistantActivity';
import { AttachmentChips } from './AttachmentChips';
import { Markdown } from './Markdown';
import { RecentFilesTooltip } from './RecentFiles';

type AssistantSegment =
	| { type: 'activity'; key: string; parts: AssistantActivityPart[]; followedByText: boolean }
	| { type: 'text'; key: string; text: string };

interface MessageViewProps {
	message: ConversationMessage;
	post: (event: ViewEvent) => void;
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
			? html`<${UserRequest} message=${message} post=${post} />`
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

const UserRequest = ({ message, post }: MessageViewProps) => {
	const text = message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');
	const attachments = message.parts.flatMap((part) => (part.type === 'data-attachments' ? part.data : []));
	const recentFiles = message.parts.flatMap((part) => (part.type === 'data-recentFiles' ? part.data : []));
	const request = html`<div class="user-request" tabindex=${recentFiles.length > 0 ? 0 : undefined}>
		<div class="user-content">${text}</div>
		<${AttachmentChips}
			attachments=${attachments}
			onOpen=${(source: string) => post({ type: 'app.openFile', source })}
		/>
	</div>`;
	return recentFiles.length > 0 ? html`<${RecentFilesTooltip} files=${recentFiles}>${request}<//>` : request;
};
