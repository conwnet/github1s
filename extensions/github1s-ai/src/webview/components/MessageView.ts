import { html } from 'htm/preact';

import type { ConversationMessage } from '@/common/conversation';
import type { ViewEvent } from '@/common/protocol';

import { messageStatusLabel } from '../helpers/presentation';
import { AssistantActivity, isAssistantActivityPart, type AssistantActivityPart } from './AssistantActivity';
import { AttachmentChips } from './AttachmentChips';
import { Icon } from './Icon';
import { Markdown } from './Markdown';
import { RecentFilesTooltip } from './RecentFiles';

type AssistantSegment =
	| { type: 'activity'; key: string; parts: AssistantActivityPart[]; followedByText: boolean }
	| { type: 'text'; key: string; text: string };

interface MessageViewProps {
	message: ConversationMessage;
	canRetry?: boolean;
	canEdit?: boolean;
	inactive?: boolean;
	post: (event: ViewEvent) => void;
}

export const MessageView = ({ message, canRetry, canEdit, inactive, post }: MessageViewProps) => {
	if (message.role !== 'user' && message.role !== 'assistant') return null;
	const segments = message.role === 'assistant' ? assistantSegments(message) : [];
	const activityRunning = segments.some(
		(segment) => segment.type === 'activity' && message.metadata.status === 'streaming' && !segment.followedByText,
	);
	const status = activityRunning ? undefined : messageStatusLabel(message.metadata);

	return html`<article class=${`message message-${message.role}`} inert=${inactive ? true : undefined}>
		${message.role === 'user'
			? html`<${UserRequest} message=${message} canEdit=${canEdit} post=${post} />`
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
		${canRetry
			? html`<button
					class="ghost-button message-retry"
					type="button"
					onClick=${() => post({ type: 'chat.retry', id: message.id })}
				>
					<${Icon} name="refresh" />
					<span>Retry</span>
				</button>`
			: null}
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

const UserRequest = ({ message, canEdit, post }: MessageViewProps) => {
	const text = message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');
	const attachments = message.parts.flatMap((part) => (part.type === 'data-attachments' ? part.data : []));
	const recentFiles = message.parts.flatMap((part) => (part.type === 'data-recentFiles' ? part.data : []));
	const edit = (event: MouseEvent | KeyboardEvent) => {
		if (!canEdit || (event.target instanceof Element && event.target.closest('button, a'))) return;
		if (event instanceof MouseEvent && window.getSelection()?.toString()) return;
		if (event instanceof KeyboardEvent) {
			if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
			event.preventDefault();
		}
		post({ type: 'chat.setEditingMessageId', id: message.id });
	};
	const request = html`<div
		class=${`user-request${canEdit ? ' user-request-editable' : ''}`}
		tabindex=${!canEdit && recentFiles.length > 0 ? 0 : undefined}
		onClick=${edit}
	>
		<div
			class="user-content"
			role=${canEdit ? 'button' : undefined}
			aria-label=${canEdit ? `Edit message: ${text}` : undefined}
			tabindex=${canEdit ? 0 : undefined}
			onKeyDown=${edit}
		>
			${text}
		</div>
		<${AttachmentChips}
			attachments=${attachments}
			onOpen=${(source: string) => post({ type: 'app.openFile', source })}
		/>
	</div>`;
	return recentFiles.length > 0 ? html`<${RecentFilesTooltip} files=${recentFiles}>${request}<//>` : request;
};
