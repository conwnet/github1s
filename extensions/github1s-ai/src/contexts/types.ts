import { isPlainObject } from 'lodash-es';

export type ContextAttachmentAction = 'selectFile' | 'currentFile' | 'currentSelection';

export interface ContextAttachmentDescriptor {
	id: string;
	type: 'file' | 'selection';
	label: string;
	source: string;
	languageId?: string;
}

export interface ContextAttachment extends ContextAttachmentDescriptor {
	content: string;
}

export const isContextAttachmentAction = (value: unknown): value is ContextAttachmentAction =>
	value === 'selectFile' || value === 'currentFile' || value === 'currentSelection';

export const isContextAttachmentDescriptor = (value: unknown): value is ContextAttachmentDescriptor => {
	if (!isPlainObject(value)) return false;
	const descriptor = value as Record<string, unknown>;
	return (
		Object.keys(descriptor).every((key) => ['id', 'type', 'label', 'source', 'languageId'].includes(key)) &&
		typeof descriptor.id === 'string' &&
		descriptor.id.length > 0 &&
		(descriptor.type === 'file' || descriptor.type === 'selection') &&
		typeof descriptor.label === 'string' &&
		typeof descriptor.source === 'string' &&
		descriptor.source.length > 0 &&
		(descriptor.languageId === undefined || typeof descriptor.languageId === 'string')
	);
};
