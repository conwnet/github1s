import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import type { ConversationHistory, HistoryImportOptions } from '@/common/conversation';
import type { PromptsConfig } from '@/common/prompts-config';
import type { ModelConfigInput, Notice, ViewEvent, ViewState } from '@/common/protocol';

import { Icon } from './Icon';
import { HistoryImportDialog } from './HistoryImportDialog';
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
									onImport=${(content: string, options: HistoryImportOptions) =>
										post({ type: 'settings.importHistory', content, options })}
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
	onImport: (content: string, options: HistoryImportOptions) => void;
	onClear: () => void;
}

const GeneralSettings = ({ notice, onExport, onImport, onClear }: GeneralSettingsProps) => {
	const fileInput = useRef<HTMLInputElement>(null);
	const [importFile, setImportFile] = useState<{ filename: string; history: ConversationHistory }>();
	const [reading, setReading] = useState(false);
	const [fileError, setFileError] = useState<Notice>();
	useEffect(() => setFileError(undefined), [notice]);

	const readFile = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		setFileError(undefined);
		setReading(true);
		try {
			const { parseConversationHistory } = await import('@/common/conversation');
			const history = await parseConversationHistory(await file.text());
			setImportFile({ filename: file.name, history });
		} catch (error) {
			setFileError({
				severity: 'error',
				message: error instanceof Error ? error.message : 'Unable to read this file.',
			});
		} finally {
			setReading(false);
		}
	};

	return html`
		<div id="settings-general-panel" class="settings-overview" role="tabpanel" aria-labelledby="settings-general-tab">
			<p class="settings-section-description">Manage saved history and settings.</p>
			<${SettingsNotice} notice=${fileError ?? notice} />
			<div class="settings-general-actions">
				<div class="settings-general-action">
					<div class="settings-general-action-copy">
						<strong>Conversation history</strong>
						<p>Import or export history for all workspaces as JSON.</p>
					</div>
					<div class="settings-form-actions">
						<button class="ghost-button settings-general-button" type="button" onClick=${onExport}>
							<${Icon} name="download" />
							Export history
						</button>
						<button
							class="ghost-button settings-general-button"
							type="button"
							disabled=${reading || !!importFile}
							onClick=${() => fileInput.current?.click()}
						>
							<${Icon} name="upload" />
							Import history
						</button>
						<input ref=${fileInput} type="file" accept=".json,application/json" hidden onChange=${readFile} />
					</div>
					<p class="settings-hint">Close other GitHub1s tabs and reload this page before import or export.</p>
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
			${importFile
				? html`<${HistoryImportDialog}
						filename=${importFile.filename}
						history=${importFile.history}
						onImport=${(options: HistoryImportOptions) => {
							onImport(JSON.stringify(importFile.history), options);
							setImportFile(undefined);
						}}
						onCancel=${() => setImportFile(undefined)}
					/>`
				: null}
		</div>
	`;
};

const SettingsNotice = ({ notice }: { notice?: Notice }) =>
	notice
		? html`<p class=${`settings-feedback settings-feedback-${notice.severity}`} role="status" aria-live="polite">
				${notice.message}
			</p>`
		: null;
