import { html } from 'htm/preact';

import type { ContextAttachmentDescriptor } from '@/common/protocol';

import { attachmentSetiIcon, setiFileIconPresentation } from '../helpers/attachments';
import { Icon } from './Icon';

interface AttachmentChipsProps {
	attachments: readonly ContextAttachmentDescriptor[];
	disabled?: boolean;
	onRemove?: (id: string) => void;
}

export const AttachmentChips = ({ attachments, disabled = false, onRemove }: AttachmentChipsProps) => {
	if (attachments.length === 0) return null;
	const readOnly = onRemove === undefined;

	return html`<div
		class="attachment-row"
		role="group"
		aria-label=${readOnly ? 'Attachments used for this message' : 'Attachments for next message'}
	>
		${attachments.map((attachment) => {
			const icon = attachmentSetiIcon(attachment);
			const presentation = setiFileIconPresentation(icon);
			const iconClass = `seti-file-icon seti-file-icon-${icon} seti-file-icon-color-${presentation.color} attachment-icon`;
			return html`<span class="attachment-chip" key=${attachment.id} title=${attachment.source}>
				<${Icon} name="file" className="attachment-file-fallback" />
				<span class=${iconClass} aria-hidden="true">${presentation.glyph}</span>
				<span class="attachment-label">${attachment.label}</span>
				${onRemove
					? html`<button
							class="chip-remove"
							type="button"
							aria-label=${`Remove ${attachment.label}`}
							title=${`Remove ${attachment.label}`}
							disabled=${disabled}
							onClick=${() => onRemove(attachment.id)}
						>
							<${Icon} name="close" />
						</button>`
					: null}
			</span>`;
		})}
	</div>`;
};
