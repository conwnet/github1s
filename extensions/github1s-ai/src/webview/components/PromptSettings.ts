import { html } from 'htm/preact';
import type { VNode } from 'preact';
import { useState } from 'preact/hooks';

import { resolvePrompts, type PromptsConfig } from '@/common/prompts-config';
import { QUICK_ACTIONS, type ChatQuickAction } from '@/common/quick-actions';

import { Icon } from './Icon';

type PromptDraft = {
	instructions: string;
	userRules: string;
	quickActions: Record<ChatQuickAction, string>;
};

const DEFAULT_PROMPTS = resolvePrompts(undefined);

const createPromptDraft = (config?: PromptsConfig): PromptDraft => ({
	instructions: config?.instructions ?? '',
	userRules: config?.userRules ?? '',
	quickActions: QUICK_ACTIONS.reduce(
		(result, { action }) => {
			result[action] = config?.quickActions?.[action] ?? '';
			return result;
		},
		{} as Record<ChatQuickAction, string>,
	),
});

interface PromptSettingsProps {
	config?: PromptsConfig;
	notice: VNode;
	onSave: (config: PromptsConfig) => void;
}

export const PromptSettings = ({ config, notice, onSave }: PromptSettingsProps) => {
	const [draft, setDraft] = useState<PromptDraft>(() => createPromptDraft(config));
	const customQuickActionCount = Object.values(draft.quickActions).filter((prompt) => prompt.trim()).length;

	const updateQuickAction = (action: ChatQuickAction, value: string) => {
		setDraft((current) => ({
			...current,
			quickActions: { ...current.quickActions, [action]: value },
		}));
	};

	return html`<form
		id="settings-prompts-panel"
		class="settings-prompts"
		role="tabpanel"
		aria-labelledby="settings-prompts-tab"
		onSubmit=${(event: SubmitEvent) => {
			event.preventDefault();
			onSave(draft);
		}}
		onReset=${(event: Event) => {
			event.preventDefault();
			setDraft(createPromptDraft());
		}}
	>
		<p class="settings-section-description">Customize the rules and prompts used for future responses.</p>
		${notice}
		<label class="settings-field">
			<span>User Rules</span>
			<textarea
				class="settings-control settings-prompt-control"
				rows="4"
				value=${draft.userRules}
				placeholder="For example: Always respond in Simplified Chinese."
				onInput=${(event: InputEvent) =>
					setDraft((current) => ({
						...current,
						userRules: (event.currentTarget as HTMLTextAreaElement).value,
					}))}
			></textarea>
			<span class="settings-hint">
				Appended to the active Instructions for future responses. Leave blank to add no user rules.
			</span>
		</label>
		<details class="settings-prompt-section">
			<summary class="settings-prompt-summary">
				<span class="settings-prompt-chevron"><${Icon} name="chevron-right" /></span>
				<span class="settings-prompt-summary-label">Instructions</span>
				<span class="settings-prompt-summary-status">${draft.instructions.trim() ? 'Customized' : 'Built-in'}</span>
			</summary>
			<div class="settings-prompt-section-content">
				<p class="settings-section-description">
					Replace GitHub1s AI's built-in Instructions. Leave blank to use the built-in default.
				</p>
				<label class="settings-field">
					<span class="settings-visually-hidden">Instructions</span>
					<textarea
						class="settings-control settings-prompt-control"
						rows="6"
						value=${draft.instructions}
						placeholder=${DEFAULT_PROMPTS.instructions}
						onInput=${(event: InputEvent) =>
							setDraft((current) => ({
								...current,
								instructions: (event.currentTarget as HTMLTextAreaElement).value,
							}))}
					></textarea>
				</label>
			</div>
		</details>
		<details class="settings-prompt-section">
			<summary class="settings-prompt-summary">
				<span class="settings-prompt-chevron"><${Icon} name="chevron-right" /></span>
				<span class="settings-prompt-summary-label">Quick Actions</span>
				<span class="settings-prompt-summary-status">
					${customQuickActionCount ? `${customQuickActionCount} customized` : 'All defaults'}
				</span>
			</summary>
			<div class="settings-prompt-section-content">
				<p class="settings-section-description">
					Replace the prompt sent by each quick action. Leave fields blank to use the built-in defaults.
				</p>
				<fieldset class="settings-prompt-group">
					<legend class="settings-visually-hidden">Quick Actions</legend>
					${QUICK_ACTIONS.map(
						({ action, title }) =>
							html`<label key=${action} class="settings-field">
								<span>${title}</span>
								<textarea
									class="settings-control settings-prompt-control"
									value=${draft.quickActions[action]}
									placeholder=${DEFAULT_PROMPTS.quickActions[action]}
									onInput=${(event: InputEvent) =>
										updateQuickAction(action, (event.currentTarget as HTMLTextAreaElement).value)}
								></textarea>
							</label>`,
					)}
				</fieldset>
			</div>
		</details>
		<div class="settings-form-actions">
			<button class="primary" type="submit">Save prompts</button>
			<button class="ghost-button" type="reset">Reset</button>
		</div>
	</form>`;
};
