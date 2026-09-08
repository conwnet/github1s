import { html } from 'htm/preact';
import { useEffect, useState } from 'preact/hooks';

import type { PromptsConfig } from '@/common/prompts-config';
import type { ModelConfigInput, Notice, ViewEvent, ViewState } from '@/common/protocol';

import { Icon } from './Icon';
import { McpSettings } from './McpSettings';
import { ModelEditor, ModelSettings } from './ModelSettings';
import { PageHeader } from './PageHeader';
import { PromptSettings } from './PromptSettings';

interface SettingsPageProps {
	state: ViewState;
	post: (event: ViewEvent) => void;
}

type ModelConfigSummary = ViewState['modelConfigs']['configs'][number];
type ModelEditorState = {
	existingConfig?: ModelConfigSummary;
};

const SETTINGS_SECTIONS = [
	{ id: 'models', label: 'Models' },
	{ id: 'prompts', label: 'Prompts' },
	{ id: 'mcp', label: 'MCP' },
	{ id: 'general', label: 'General' },
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['id'];

export const SettingsPage = ({ state, post }: SettingsPageProps) => {
	const [modelEditor, setModelEditor] = useState<ModelEditorState>();
	const [section, setSection] = useState<SettingsSection>('models');
	const feedback = state.runtime.settings.feedback;

	useEffect(() => {
		if (feedback?.severity === 'success') setModelEditor(undefined);
	}, [feedback]);

	const openEditor = (existingConfig?: ModelConfigSummary) => {
		post({ type: 'settings.clearFeedback' });
		setModelEditor({ existingConfig });
	};

	const selectSection = (next: SettingsSection) => {
		if (next === section) return;
		post({ type: 'settings.clearFeedback' });
		setSection(next);
	};

	const editing = modelEditor !== undefined;
	const content = modelEditor
		? html`<${SettingsNotice} notice=${feedback} />
				<${ModelEditor}
					existingConfig=${modelEditor.existingConfig}
					onCancel=${() => setModelEditor(undefined)}
					onSave=${(config: ModelConfigInput) => post({ type: 'settings.saveModelConfig', config })}
				/>`
		: html`<${SettingsTabs} active=${section} onChange=${selectSection} /> ${section === 'models'
					? html`<${ModelSettings}
							configs=${state.modelConfigs.configs}
							notice=${html`<${SettingsNotice} notice=${feedback} />`}
							onAdd=${() => openEditor()}
							onEdit=${openEditor}
							onDelete=${(id: string) => post({ type: 'settings.deleteModelConfig', id })}
						/>`
					: section === 'prompts'
						? html`<${PromptSettings}
								config=${state.promptsConfig}
								notice=${html`<${SettingsNotice} notice=${feedback} />`}
								onSave=${(config: PromptsConfig) => post({ type: 'settings.savePromptsConfig', config })}
							/>`
						: section === 'mcp'
							? html`<${McpSettings}
									config=${state.mcpConfig}
									notice=${html`<${SettingsNotice} notice=${feedback} />`}
									onSave=${(json: string) => post({ type: 'settings.saveMcpConfig', json })}
								/>`
							: html`<${GeneralSettings}
									notice=${feedback}
									onExport=${() => post({ type: 'settings.exportHistory' })}
									onClear=${() => post({ type: 'settings.clearAllData' })}
								/>`}`;

	return html`<section class="settings-page" aria-label="AI settings">
		<${PageHeader}
			title=${editing ? (modelEditor.existingConfig ? 'Edit Model' : 'Add Model') : 'Settings'}
			backLabel=${editing ? 'Back to settings' : 'Back to chat'}
			onBack=${editing ? () => setModelEditor(undefined) : () => post({ type: 'app.openChat' })}
		/>
		${content}
	</section>`;
};

interface SettingsTabsProps {
	active: SettingsSection;
	onChange: (section: SettingsSection) => void;
}

const SettingsTabs = ({ active, onChange }: SettingsTabsProps) => {
	const selectWithKeyboard = (event: KeyboardEvent) => {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		const direction = event.key === 'ArrowRight' ? 1 : -1;
		const currentIndex = SETTINGS_SECTIONS.findIndex(({ id }) => id === active);
		const nextIndex = (currentIndex + direction + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length;
		const next = SETTINGS_SECTIONS[nextIndex].id;
		onChange(next);
		requestAnimationFrame(() => document.getElementById(`settings-${next}-tab`)?.focus());
	};

	return html`<div class="settings-tabs" role="tablist" aria-label="Settings sections">
		${SETTINGS_SECTIONS.map(({ id, label }) => {
			const selected = active === id;
			return html`<button
				key=${id}
				id=${`settings-${id}-tab`}
				class=${selected ? 'settings-tab settings-tab-active' : 'settings-tab'}
				type="button"
				role="tab"
				aria-controls=${`settings-${id}-panel`}
				aria-selected=${selected}
				tabindex=${selected ? 0 : -1}
				onClick=${() => onChange(id)}
				onKeyDown=${selectWithKeyboard}
			>
				${label}
			</button>`;
		})}
	</div>`;
};

interface GeneralSettingsProps {
	notice?: Notice;
	onExport: () => void;
	onClear: () => void;
}

const GeneralSettings = ({ notice, onExport, onClear }: GeneralSettingsProps) => html`
	<div id="settings-general-panel" class="settings-overview" role="tabpanel" aria-labelledby="settings-general-tab">
		<p class="settings-section-description">Manage conversation history and locally stored GitHub1s AI data.</p>
		<${SettingsNotice} notice=${notice} />
		<div class="settings-general-actions">
			<div class="settings-general-action">
				<div class="settings-general-action-copy">
					<strong>Conversation history</strong>
					<p>Download all conversations as JSON. Attached code and file contents may be included.</p>
				</div>
				<button class="ghost-button settings-general-button" type="button" onClick=${onExport}>
					<${Icon} name="download" />
					Export history
				</button>
			</div>
			<div class="settings-general-action">
				<div class="settings-general-action-copy">
					<strong>All local data</strong>
					<p>Permanently delete conversations across all workspaces, model settings, MCP settings, and prompts.</p>
				</div>
				<button class="ghost-button settings-general-button settings-danger" type="button" onClick=${onClear}>
					<${Icon} name="trash" />
					Clear all data
				</button>
			</div>
		</div>
	</div>
`;

const SettingsNotice = ({ notice }: { notice?: Notice }) =>
	notice
		? html`<p class=${`settings-feedback settings-feedback-${notice.severity}`} role="status" aria-live="polite">
				${notice.message}
			</p>`
		: null;
