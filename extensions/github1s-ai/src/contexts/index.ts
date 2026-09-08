import * as vscode from 'vscode';

import type { ContextAttachment, ContextAttachmentDescriptor } from './types';
export type { ContextAttachment, ContextAttachmentDescriptor } from './types';

export const isSameContextAttachment = (
	left: ContextAttachmentDescriptor,
	right: ContextAttachmentDescriptor,
): boolean => left.type === right.type && left.source === right.source;

export const preserveContextAttachmentId = (
	next: ContextAttachmentDescriptor,
	previous?: ContextAttachmentDescriptor,
): ContextAttachmentDescriptor =>
	previous && isSameContextAttachment(previous, next) ? { ...next, id: previous.id } : { ...next };

export const resolveContextAttachments = async (
	descriptors: readonly ContextAttachmentDescriptor[],
): Promise<ContextAttachment[]> =>
	Promise.all(
		descriptors.map(async (descriptor) => {
			const uri = vscode.Uri.parse(descriptor.source);
			let range: vscode.Range | undefined;
			if (descriptor.type === 'selection') {
				const match = /^L(\d+):(\d+)-L(\d+):(\d+)$/.exec(uri.fragment);
				if (!match) {
					throw new Error(`Invalid selection source: ${descriptor.source}`);
				}
				const positions = match.slice(1).map(Number);
				if (positions.some((position) => position < 1)) {
					throw new Error(`Invalid selection source: ${descriptor.source}`);
				}
				const [startLine, startCharacter, endLine, endCharacter] = positions;
				range = new vscode.Range(startLine - 1, startCharacter - 1, endLine - 1, endCharacter - 1);
			}
			const document = await vscode.workspace.openTextDocument(uri.with({ fragment: '' }));
			return {
				...descriptor,
				content: document.getText(range),
				languageId: document.languageId,
			};
		}),
	);

interface FileQuickPickItem extends vscode.QuickPickItem {
	uri: vscode.Uri;
}

export const selectFile = async (): Promise<ContextAttachmentDescriptor | undefined> => {
	const uris = await vscode.workspace.findFiles('**/*');
	if (uris.length === 0) return undefined;
	const items = uris.map(toFileQuickPickItem);
	const selected = await showFileQuickPick(items);
	if (!selected) return undefined;

	return fileDescriptor(selected.uri, selected.label);
};

export const currentFile = async (
	document = vscode.window.activeTextEditor?.document,
): Promise<ContextAttachmentDescriptor | undefined> => {
	if (!document) return undefined;

	return fileDescriptor(document.uri, fileName(vscode.workspace.asRelativePath(document.uri)), document.languageId);
};

export const currentSelection = async (
	editor = vscode.window.activeTextEditor,
): Promise<ContextAttachmentDescriptor | undefined> => {
	if (!editor || editor.selection.isEmpty) return undefined;

	const { document, selection } = editor;
	const startLine = selection.start.line + 1;
	const endLine =
		selection.end.character === 0 && selection.end.line > selection.start.line
			? selection.end.line
			: selection.end.line + 1;
	const range = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;
	const fragment = `L${selection.start.line + 1}:${selection.start.character + 1}-L${selection.end.line + 1}:${selection.end.character + 1}`;

	return {
		id: globalThis.crypto.randomUUID(),
		type: 'selection',
		label: `${fileName(vscode.workspace.asRelativePath(document.uri))}:${range}`,
		source: document.uri.with({ fragment }).toString(),
		languageId: document.languageId,
	};
};

const toFileQuickPickItem = (uri: vscode.Uri): FileQuickPickItem => {
	const path = vscode.workspace.asRelativePath(uri);
	const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
	return {
		label: fileName(path),
		description: separator === -1 ? undefined : path.slice(0, separator),
		uri,
	};
};

const fileName = (path: string): string => path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1);

const showFileQuickPick = (items: readonly FileQuickPickItem[]): Promise<FileQuickPickItem | undefined> => {
	const picker = vscode.window.createQuickPick<FileQuickPickItem>();
	picker.items = items;
	picker.matchOnDescription = true;
	picker.placeholder = 'Select a file to attach';

	return new Promise((resolve) => {
		let settled = false;
		const disposables: vscode.Disposable[] = [];
		const finish = (item: FileQuickPickItem | undefined): void => {
			if (settled) return;
			settled = true;
			disposables.forEach((disposable) => disposable.dispose());
			picker.dispose();
			resolve(item);
		};

		disposables.push(
			picker.onDidAccept(() => finish(picker.selectedItems[0])),
			picker.onDidHide(() => finish(undefined)),
		);
		picker.show();
	});
};

const fileDescriptor = (uri: vscode.Uri, label: string, languageId?: string): ContextAttachmentDescriptor => ({
	id: globalThis.crypto.randomUUID(),
	type: 'file',
	label,
	source: uri.toString(),
	...(languageId ? { languageId } : {}),
});
