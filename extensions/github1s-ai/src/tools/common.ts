import * as vscode from 'vscode';

export type WorkspaceEntryType = 'file' | 'directory' | 'unknown';

export type ToolValidationResult<T> = { success: true; value: T } | { success: false; error: Error };

const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;
const BINARY_SAMPLE_BYTES = 8192;
const WORKSPACE_SEARCH_TIMEOUT_MS = 30_000;

export const invalidToolInput = <T>(message: string): ToolValidationResult<T> => ({
	success: false,
	error: new Error(message),
});

export const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => {
	const allowedKeys = new Set(allowed);
	return Object.keys(value).every((key) => allowedKeys.has(key));
};

export const resolveWorkspacePath = (path: string): vscode.Uri => {
	const root = vscode.workspace.workspaceFolders?.[0]?.uri;
	if (!root) throw new Error('No repository workspace is open.');
	return path === '.' ? root : vscode.Uri.joinPath(root, path);
};

export const entryType = (type: vscode.FileType): WorkspaceEntryType => {
	if ((type & vscode.FileType.Directory) !== 0) return 'directory';
	if ((type & vscode.FileType.File) !== 0) return 'file';
	return 'unknown';
};

export const readUtf8TextFile = async (uri: vscode.Uri, size: number): Promise<string> => {
	if (size > MAX_TEXT_FILE_BYTES) {
		throw new Error('file is larger than 5 MiB.');
	}
	const bytes = await vscode.workspace.fs.readFile(uri);
	if (bytes.byteLength > MAX_TEXT_FILE_BYTES) {
		throw new Error('file is larger than 5 MiB.');
	}
	if (looksBinary(bytes)) {
		throw new Error('binary files are not supported.');
	}
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new Error('file is not valid UTF-8 text.');
	}
};

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const runWorkspaceSearch = async <T>(
	operation: (token: vscode.CancellationToken) => PromiseLike<T>,
	abortSignal?: AbortSignal,
): Promise<T> => {
	const cancellationSource = new vscode.CancellationTokenSource();
	let rejectCancellation: (error: Error) => void = () => undefined;
	const cancellation = new Promise<never>((_resolve, reject) => {
		rejectCancellation = reject;
	});
	const cancel = (message: string) => {
		rejectCancellation(new Error(message));
		cancellationSource.cancel();
	};
	const onAbort = () => cancel('Workspace search was canceled.');
	if (abortSignal?.aborted) onAbort();
	else abortSignal?.addEventListener('abort', onAbort, { once: true });
	const timeout = setTimeout(
		() => cancel(`Workspace search timed out after ${WORKSPACE_SEARCH_TIMEOUT_MS}ms.`),
		WORKSPACE_SEARCH_TIMEOUT_MS,
	);

	try {
		const result = abortSignal?.aborted ? cancellation : operation(cancellationSource.token);
		return await Promise.race([result, cancellation]);
	} finally {
		clearTimeout(timeout);
		abortSignal?.removeEventListener('abort', onAbort);
		cancellationSource.dispose();
	}
};

export const normalizeWorkspacePath = (value: string, allowRoot = false): string | undefined => {
	if (!value || value.includes('\0')) {
		return undefined;
	}
	const path = value.replace(/\\/g, '/');
	if (path.startsWith('/') || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path)) {
		// Discuss: `foo:bar.txt` also whill be rejected here
		return undefined;
	}

	const segments: string[] = [];
	for (const segment of path.split('/')) {
		if (!segment || segment === '.') continue;
		if (segment === '..') return undefined;
		segments.push(segment);
	}
	return segments.length > 0 ? segments.join('/') : allowRoot ? '.' : undefined;
};

const looksBinary = (bytes: Uint8Array): boolean => {
	if (bytes.includes(0)) return true;
	const sample = bytes.subarray(0, BINARY_SAMPLE_BYTES);
	let controlCharacters = 0;
	for (const byte of sample) {
		if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 12 && byte !== 13) {
			controlCharacters += 1;
		}
	}
	return sample.length > 0 && controlCharacters / sample.length > 0.1;
};
