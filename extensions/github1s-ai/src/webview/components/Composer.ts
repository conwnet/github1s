import { html } from 'htm/preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { ViewEvent, ViewState } from '@/common/protocol';

import { resizeComposer, shouldSubmitComposer } from '../helpers/composer';
import { presentConversationUsage } from '../helpers/presentation';
import { AttachmentChips } from './AttachmentChips';
import { Icon } from './Icon';
import { RecentFilesTooltip } from './RecentFiles';
import { Tooltip, TooltipButton } from './Tooltip';

const ATTACHMENT_ACTIONS = [
	{
		action: 'selectFile',
		icon: 'add',
		title: 'Add file…',
	},
	{
		action: 'currentFile',
		icon: 'file',
		attachment: 'currentFile',
		subject: 'current file',
	},
	{
		action: 'currentSelection',
		icon: 'selection',
		attachment: 'currentSelection',
		subject: 'current selection',
	},
] as const;

interface ComposerProps {
	state: ViewState;
	busy: boolean;
	active: boolean;
	post: (event: ViewEvent) => void;
}

export const Composer = ({ state, busy, active, post }: ComposerProps) => {
	const [draft, setDraft] = useState('');
	const textarea = useRef<HTMLTextAreaElement>(null);
	const chat = state.runtime.chat;
	const preparing = chat.preparing === true;
	const recentFiles = chat.recentFiles ?? [];
	const includeRecentFiles = chat.includeRecentFiles !== false;
	const selectedModelConfig = state.modelConfigs.configs.find(({ id }) => id === state.modelConfigs.selectedId);
	const selectedModelConfigId = selectedModelConfig?.id;
	const conversationUsage = chat.conversation?.usage;
	const usage = useMemo(() => presentConversationUsage(conversationUsage), [conversationUsage]);
	const wasBusy = useRef(busy);
	const message = draft.trim();

	useLayoutEffect(() => {
		if (textarea.current) resizeComposer(textarea.current);
	}, [draft]);

	useEffect(() => {
		if (active && wasBusy.current && !busy) textarea.current?.focus();
		wasBusy.current = busy;
	}, [active, busy]);

	const submit = () => {
		if (!message || busy || !selectedModelConfigId) return;
		post({ type: 'chat.send', text: message });
		setDraft('');
	};

	const onInput = (event: InputEvent) => {
		setDraft((event.currentTarget as HTMLTextAreaElement).value);
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (!shouldSubmitComposer(event)) return;
		event.preventDefault();
		submit();
	};

	return html`<section class="composer-wrap" aria-label="Chat composer">
		<div class="composer-surface">
			<${AttachmentChips}
				attachments=${chat.pendingAttachments ?? []}
				disabled=${preparing}
				onOpen=${(source: string) => post({ type: 'app.openFile', source })}
				onRemove=${(id: string) => post({ type: 'chat.removeContextAttachment', id })}
			/>
			<textarea
				ref=${textarea}
				class="composer-input"
				value=${draft}
				disabled=${preparing}
				rows="1"
				aria-label="Ask GitHub1s AI"
				placeholder="Ask about this repository…"
				onInput=${onInput}
				onKeyDown=${onKeyDown}
			></textarea>
			<div class="composer-toolbar">
				<div class="composer-context-actions" role="group" aria-label="Add context">
					${ATTACHMENT_ACTIONS.map((item) => {
						const presentation = presentAttachmentAction(item, chat);
						return html`<${TooltipButton}
							key=${item.action}
							class="ghost-button attachment-action"
							label=${presentation.title}
							disabled=${preparing || !presentation.available}
							onClick=${() => post({ type: 'chat.addContextAttachment', action: item.action })}
						>
							<${Icon} name=${item.icon} />
						<//>`;
					})}
					<${RecentFilesTooltip}
						files=${recentFiles}
						hint=${includeRecentFiles ? 'On · Click to disable' : 'Off · Click to enable'}
					>
						<button
							class="ghost-button attachment-action recent-files-action"
							type="button"
							aria-label="Include recent files"
							aria-pressed=${includeRecentFiles}
							disabled=${preparing}
							onClick=${() => post({ type: 'chat.setIncludeRecentFiles', enabled: !includeRecentFiles })}
						>
							<${Icon} name="history" />
							${!includeRecentFiles || recentFiles.length > 0
								? html`<span class="recent-files-badge" aria-hidden="true">
										${includeRecentFiles ? recentFiles.length : null}
									</span>`
								: null}
						</button>
					<//>
				</div>
				<div class="composer-controls">
					${usage
						? html`<${Tooltip}
								content=${html`<div class="tooltip-content">
									<strong>Tokens usage:</strong>
									<ul>
										${usage.details.map((detail) => html`<li key=${detail}>${detail}</li>`)}
									</ul>
								</div>`}
							>
								<span class="conversation-usage" tabindex="0" aria-label=${usage.title}>
									<span class="conversation-usage-value">${usage.value}</span>
									<span class="conversation-usage-unit">tokens</span>
								</span>
							<//>`
						: null}
					<div class="model-config-picker">
						<${Tooltip} content=${selectedModelConfig?.modelId ?? 'Select LLM model'}>
							<select
								class="model-config-select"
								aria-label="AI model"
								value=${selectedModelConfigId ?? ''}
								onChange=${(event: Event) =>
									post({
										type: 'settings.selectModelConfig',
										id: (event.currentTarget as HTMLSelectElement).value,
									})}
							>
								${state.modelConfigs.configs.map(
									(config) => html`<option key=${config.id} value=${config.id}>${config.name}</option>`,
								)}
							</select>
						<//>
						<span class="model-config-chevron"><${Icon} name="chevron-right" /></span>
					</div>
					<${TooltipButton}
						class="submit-button"
						label=${busy ? 'Stop generating' : 'Send message'}
						disabled=${!busy && (!message || !selectedModelConfigId)}
						onClick=${busy ? () => post({ type: 'chat.cancel' }) : submit}
					>
						<${Icon} name=${busy ? 'stop' : 'send'} />
					<//>
				</div>
			</div>
		</div>
	</section>`;
};

const presentAttachmentAction = (
	item: (typeof ATTACHMENT_ACTIONS)[number],
	chat: ViewState['runtime']['chat'],
): { title: string; available: boolean } => {
	if ('title' in item) return { title: item.title, available: true };
	const attachment = chat[item.attachment];
	return {
		title: attachment ? `Attach ${item.subject}:\n${attachment.label}` : `No ${item.subject} available`,
		available: attachment !== undefined,
	};
};
