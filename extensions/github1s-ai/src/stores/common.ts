import * as vscode from 'vscode';

export const DEFAULT_STORE_VERSION = 2026081820;

interface PersistData<T> {
	version: number;
	data?: T;
}

type MementoPersistOptions<T> = {
	memento: vscode.Memento;
	storeKey: string;
	version?: number;
	check?: (value: unknown) => value is T;
};

export class MementoPersist<T> {
	constructor(private readonly options: MementoPersistOptions<T>) {}

	async read(): Promise<T | undefined> {
		const { memento, storeKey, check } = this.options;
		const version = this.options.version ?? DEFAULT_STORE_VERSION;

		const stored = memento.get<PersistData<T> | undefined>(storeKey, undefined);
		if (stored?.version !== version) {
			return undefined;
		}
		if (check && !check(stored?.data)) {
			return undefined;
		}
		return stored.data;
	}

	async write(data: T): Promise<void> {
		const { memento, storeKey } = this.options;
		const version = this.options.version ?? DEFAULT_STORE_VERSION;
		return await memento.update(storeKey, { version, data } satisfies PersistData<T>);
	}

	async delete(): Promise<void> {
		const { memento, storeKey } = this.options;
		await memento.update(storeKey, undefined);
	}
}

type FilePersistOptions = {
	fileUri: vscode.Uri;
	version?: number;
	check?: (value: unknown) => boolean;
};

export class FilePersist<T> {
	private readonly fileSystem = vscode.workspace.fs;

	constructor(private readonly options: FilePersistOptions) {}

	async read(): Promise<T | undefined> {
		try {
			const bytes = await this.fileSystem.readFile(this.options.fileUri);
			const stored = JSON.parse(new TextDecoder().decode(bytes));
			const version = this.options.version ?? DEFAULT_STORE_VERSION;
			if (stored?.version !== version) {
				return undefined;
			}
			if (this.options.check && !this.options.check(stored?.data)) {
				return undefined;
			}
			return stored.data;
		} catch (error) {
			if ((error as { code?: string })?.code !== 'FileNotFound') throw error;
		}
	}

	async write(data: T): Promise<void> {
		const version = this.options.version ?? DEFAULT_STORE_VERSION;
		const stored: PersistData<T> = { version, data };
		const bytes = new TextEncoder().encode(JSON.stringify(stored));
		try {
			await this.fileSystem.writeFile(this.options.fileUri, bytes);
		} catch (error) {
			if ((error as { code?: string })?.code !== 'FileNotFound') throw error;
			await this.fileSystem.createDirectory(vscode.Uri.joinPath(this.options.fileUri, '..'));
			await this.fileSystem.writeFile(this.options.fileUri, bytes);
		}
	}

	async delete(): Promise<void> {
		try {
			await this.fileSystem.delete(this.options.fileUri);
		} catch (error) {
			if ((error as { code?: string }).code !== 'FileNotFound') throw error;
		}
	}
}
