import { isPlainObject } from 'lodash-es';

import { hasExactKeys } from '@/helpers/validate';

export type ContextAttachmentAction = 'selectFile' | 'currentFile' | 'currentSelection';

export interface ContextReference {
	source: string;
}

export interface ContextAttachmentDescriptor extends ContextReference {
	id: string;
	type: 'file' | 'selection';
	label: string;
	languageId?: string;
}

export interface ContextAttachment extends ContextAttachmentDescriptor {
	content: string;
}

export const contextReferencePath = ({ source }: ContextReference): string => {
	try {
		// GitHub1s workspaces are rooted at the repository's URI path '/'.
		return decodeURIComponent(new URL(source).pathname).replace(/^\//, '');
	} catch {
		return source;
	}
};

export const fileName = (path: string): string =>
	path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1);

export const isContextReference = (value: unknown): value is ContextReference => {
	if (!isPlainObject(value)) return false;
	const reference = value as Record<string, unknown>;
	return hasExactKeys(reference, ['source']) && typeof reference.source === 'string' && reference.source.length > 0;
};

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

export const isContextAttachment = (value: unknown): value is ContextAttachment => {
	if (!isPlainObject(value)) return false;
	const { content, ...descriptor } = value as Record<string, unknown>;
	return typeof content === 'string' && isContextAttachmentDescriptor(descriptor);
};
