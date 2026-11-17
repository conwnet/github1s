import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import type { ConversationHistory, HistoryImportOptions } from '@/common/conversation';

import { Icon } from './Icon';
import { TooltipButton } from './Tooltip';

interface HistoryImportDialogProps {
	filename: string;
	history: ConversationHistory;
	onImport: (options: HistoryImportOptions) => void;
	onCancel: () => void;
}

export const HistoryImportDialog = ({ filename, history, onImport, onCancel }: HistoryImportDialogProps) => {
	const dialog = useRef<HTMLDialogElement>(null);
	const [mode, setMode] = useState<'merge' | 'replace'>('merge');
	const [conflicts, setConflicts] = useState<'keep' | 'overwrite'>('keep');
	const workspaceCount = history.workspaces.length;
	const conversationCount = history.workspaces.reduce((count, workspace) => count + workspace.conversations.length, 0);
	const summary = `${workspaceCount} ${workspaceCount === 1 ? 'workspace' : 'workspaces'} · ${conversationCount} ${conversationCount === 1 ? 'conversation' : 'conversations'}`;

	useEffect(() => {
		const element = dialog.current!;
		element.showModal();
		return () => element.close();
	}, []);

	const submit = (event: SubmitEvent) => {
		event.preventDefault();
		onImport(mode === 'merge' ? { mode, conflicts } : { mode });
	};

	return html`<dialog
		ref=${dialog}
		class="history-import-dialog"
		aria-labelledby="history-import-title"
		aria-describedby="history-import-summary"
		onCancel=${onCancel}
	>
		<form class="history-import-content" onSubmit=${submit}>
			<h3 id="history-import-title">Import history</h3>
			<div id="history-import-summary" class="history-import-summary">
				<p class="history-import-filename" title=${filename}>${filename}</p>
				<p>${summary}</p>
			</div>
			<fieldset class="history-import-field">
				<legend>
					<span class="history-import-label"
						>Import mode
						<${TooltipButton}
							class="icon-button"
							label=${'Merge combines history by workspace.\nReplace uses only imported history.'}
						>
							<${Icon} name="info" />
						<//>
					</span>
				</legend>
				<div class="history-import-options">
					${(['merge', 'replace'] as const).map(
						(value) =>
							html`<label>
								<input
									type="radio"
									name="history-import-mode"
									value=${value}
									checked=${mode === value}
									autofocus=${value === 'merge'}
									onChange=${() => setMode(value)}
								/>
								${value === 'merge' ? 'Merge' : 'Replace'}
							</label>`,
					)}
				</div>
			</fieldset>
			${mode === 'merge'
				? html`<fieldset class="history-import-field">
						<legend>
							<span class="history-import-label"
								>On conflict
								<${TooltipButton}
									class="icon-button"
									label=${'For matching IDs in the same workspace:\nKeep preserves the local conversation.\nOverwrite uses the imported conversation.'}
								>
									<${Icon} name="info" />
								<//>
							</span>
						</legend>
						<div class="history-import-options">
							${(['keep', 'overwrite'] as const).map(
								(value) =>
									html`<label>
										<input
											type="radio"
											name="history-import-conflicts"
											value=${value}
											checked=${conflicts === value}
											onChange=${() => setConflicts(value)}
										/>
										${value === 'keep' ? 'Keep' : 'Overwrite'}
									</label>`,
							)}
						</div>
					</fieldset>`
				: html`<p class="history-import-warning" role="note">
						This replaces all workspace history. Conversations not in the file will be deleted.
					</p>`}
			<div class="settings-form-actions history-import-actions">
				<button class="ghost-button" type="button" onClick=${onCancel}>Cancel</button>
				<button class="primary" type="submit">${mode === 'replace' ? 'Replace' : 'Import'}</button>
			</div>
		</form>
	</dialog>`;
};
