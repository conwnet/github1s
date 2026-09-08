import type * as vscode from 'vscode';

import { isPromptsConfig, normalizePromptsConfig, type PromptsConfig } from '@/common/prompts-config';

import { MementoPersist } from './common';

const PROMPTS_CONFIG_STORAGE_KEY = 'GITHUB1S-AI.PROMPTS_CONFIG';

export class PromptsConfigStore {
	private readonly persist: MementoPersist<PromptsConfig>;

	constructor(context: vscode.ExtensionContext) {
		this.persist = new MementoPersist({
			memento: context.globalState,
			storeKey: PROMPTS_CONFIG_STORAGE_KEY,
			check: isPromptsConfig,
		});
	}

	async get(): Promise<PromptsConfig> {
		return (await this.persist.read()) ?? {};
	}

	async set(config: PromptsConfig): Promise<void> {
		await this.persist.write(normalizePromptsConfig(config) ?? {});
	}

	async clear(): Promise<void> {
		await this.persist.delete();
	}
}
