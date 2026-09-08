import { html } from 'htm/preact';
import type { VNode } from 'preact';
import { useState } from 'preact/hooks';

import {
	MODEL_PROTOCOL_LABELS,
	MODEL_PROVIDERS,
	MODEL_PROVIDER_IDS,
	isModelProtocol,
	isModelProvider,
	type ModelProtocol,
	type ModelProvider,
} from '@/common/model-config';
import type { ModelConfigInput, ViewState } from '@/common/protocol';

import { Icon } from './Icon';

type ModelDraftField = Exclude<keyof Omit<ModelConfigInput, 'id'>, 'provider' | 'protocol'>;
type ModelConfigSummary = ViewState['modelConfigs']['configs'][number];

const createModelDraft = (config?: ModelConfigSummary): ModelConfigInput => {
	const provider = config?.provider ?? 'custom';
	return {
		...(config ? { id: config.id } : {}),
		name: config?.name ?? '',
		provider,
		protocol: config?.protocol ?? MODEL_PROVIDERS[provider].protocols[0],
		baseURL: config?.baseURL ?? MODEL_PROVIDERS[provider].defaultBaseURL ?? '',
		apiKey: '',
		modelId: config?.modelId ?? '',
	};
};

interface ModelEditorProps {
	existingConfig?: ModelConfigSummary;
	onCancel: () => void;
	onSave: (draft: ModelConfigInput) => void;
}

export const ModelEditor = ({ existingConfig, onCancel, onSave }: ModelEditorProps) => {
	const [draft, setDraft] = useState<ModelConfigInput>(() => createModelDraft(existingConfig));

	const onInput = (field: ModelDraftField) => (event: InputEvent) => {
		setDraft((current) => ({ ...current, [field]: (event.currentTarget as HTMLInputElement).value }));
	};
	const onProviderInput = (event: InputEvent) => {
		const nextProvider = (event.currentTarget as HTMLSelectElement).value;
		if (!isModelProvider(nextProvider)) return;
		setDraft((current) => ({
			...current,
			provider: nextProvider,
			protocol: MODEL_PROVIDERS[nextProvider].protocols[0],
			baseURL: MODEL_PROVIDERS[nextProvider].defaultBaseURL ?? '',
		}));
	};
	const onProtocolInput = (event: InputEvent) => {
		const protocol = (event.currentTarget as HTMLSelectElement).value;
		if (!isModelProtocol(protocol)) return;
		setDraft((current) => ({ ...current, protocol }));
	};
	const provider = MODEL_PROVIDERS[draft.provider];

	return html`<div class="settings-editor">
		<section class="settings-security" aria-label="Local storage warning">
			<strong>Stored locally</strong>
			<p>
				Model settings and API keys are stored in this browser. Don't forget to delete them if using an untrusted
				device.
			</p>
		</section>
		<form
			class="settings-form"
			onSubmit=${(event: SubmitEvent) => {
				event.preventDefault();
				onSave(draft);
			}}
		>
			<label class="settings-field">
				<span>Name</span>
				<input
					class="settings-control"
					type="text"
					value=${draft.name}
					required
					autocomplete="off"
					autofocus
					onInput=${onInput('name')}
				/>
			</label>
			<label class="settings-field">
				<span>Provider</span>
				<select class="settings-control" value=${draft.provider} required onInput=${onProviderInput}>
					${MODEL_PROVIDER_IDS.map(
						(providerId: ModelProvider) =>
							html`<option value=${providerId}>${MODEL_PROVIDERS[providerId].label}</option>`,
					)}
				</select>
			</label>
			${provider.protocols.length > 1
				? html`<label class="settings-field">
						<span>Protocol</span>
						<select class="settings-control" value=${draft.protocol} required onInput=${onProtocolInput}>
							${provider.protocols.map(
								(protocol: ModelProtocol) =>
									html`<option value=${protocol}>${MODEL_PROTOCOL_LABELS[protocol]}</option>`,
							)}
						</select>
					</label>`
				: null}
			<label class="settings-field">
				<span>Base URL</span>
				<input
					class="settings-control"
					type="url"
					value=${draft.baseURL}
					required
					autocomplete="url"
					placeholder=${provider.defaultBaseURL ?? 'http://localhost:1234/v1'}
					onInput=${onInput('baseURL')}
				/>
			</label>
			<label class="settings-field">
				<span>API key</span>
				<input
					class="settings-control"
					type="password"
					value=${draft.apiKey}
					required=${!existingConfig}
					autocomplete="off"
					placeholder=${existingConfig ? 'Leave blank to keep the saved API key' : undefined}
					onInput=${onInput('apiKey')}
				/>
			</label>
			<label class="settings-field">
				<span>Model ID</span>
				<input
					class="settings-control"
					type="text"
					value=${draft.modelId}
					required
					placeholder=${provider.modelIdPlaceholder}
					onInput=${onInput('modelId')}
				/>
			</label>
			<div class="settings-form-actions">
				<button class="primary" type="submit">Save Model</button>
				<button class="ghost-button" type="button" onClick=${onCancel}>Cancel</button>
			</div>
		</form>
	</div>`;
};

interface ModelSettingsProps {
	configs: readonly ModelConfigSummary[];
	notice: VNode;
	onAdd: () => void;
	onEdit: (config: ModelConfigSummary) => void;
	onDelete: (id: string) => void;
}

export const ModelSettings = ({ configs, notice, onAdd, onEdit, onDelete }: ModelSettingsProps) => {
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>();

	return html`<div
		id="settings-models-panel"
		class="settings-overview"
		role="tabpanel"
		aria-labelledby="settings-models-tab"
	>
		<p class="settings-section-description">Choose which providers and models are available in chat.</p>
		${notice}
		${configs.length === 0
			? html`<p class="settings-empty">No models configured yet.</p>`
			: html`<div class="settings-list" aria-label="Configured models">
					${configs.map(
						(config) =>
							html`<${ModelCard}
								key=${config.id}
								config=${config}
								confirmingDelete=${confirmingDeleteId === config.id}
								onEdit=${() => onEdit(config)}
								onRequestDelete=${() => setConfirmingDeleteId(config.id)}
								onCancelDelete=${() => setConfirmingDeleteId(undefined)}
								onDelete=${() => {
									onDelete(config.id);
									setConfirmingDeleteId(undefined);
								}}
							/>`,
					)}
				</div>`}
		<button class="primary settings-add-model" type="button" onClick=${onAdd}>
			<${Icon} name="add" />
			Add model
		</button>
	</div>`;
};

interface ModelCardProps {
	config: ModelConfigSummary;
	confirmingDelete: boolean;
	onEdit: () => void;
	onRequestDelete: () => void;
	onCancelDelete: () => void;
	onDelete: () => void;
}

const ModelCard = ({ config, confirmingDelete, onEdit, onRequestDelete, onCancelDelete, onDelete }: ModelCardProps) => {
	return html`<article class="settings-card">
		<div class="settings-card-copy">
			<h3>${config.name}</h3>
			<p class="settings-meta" title=${config.modelId}>
				<span>${MODEL_PROVIDERS[config.provider]?.label} · ${config.modelId}</span>
			</p>
		</div>
		${confirmingDelete
			? html`<div class="delete-confirmation" role="group" aria-label=${`Delete ${config.name}?`}>
					<div class="settings-card-actions">
						<button class="ghost-button" type="button" aria-label="Cancel deletion" onClick=${onCancelDelete}>
							Cancel
						</button>
						<button
							class="ghost-button settings-danger"
							type="button"
							aria-label=${`Confirm delete ${config.name}`}
							onClick=${onDelete}
						>
							Delete
						</button>
					</div>
				</div>`
			: html`<div class="settings-card-actions">
					<button
						class="icon-button"
						type="button"
						aria-label=${`Edit ${config.name}`}
						title=${`Edit ${config.name}`}
						onClick=${onEdit}
					>
						<${Icon} name="edit" />
					</button>
					<button
						class="icon-button"
						type="button"
						aria-label=${`Delete ${config.name}`}
						title=${`Delete ${config.name}`}
						onClick=${onRequestDelete}
					>
						<${Icon} name="trash" />
					</button>
				</div>`}
	</article>`;
};
