import { isPlainObject, omit } from 'lodash-es';
import type * as vscode from 'vscode';

import { isModelConfig, type ModelConfig, type ModelConfigSummary } from '@/common/model-config';
import { createAsyncQueue } from '@/helpers/async-queue';

import { MementoPersist } from './common';

const MODEL_CONFIGS_STORAGE_KEY = 'GITHUB1S-AI.MODEL_CONFIGS';

interface ModelConfigsState {
	selectedId?: string;
	configs: ModelConfig[];
}

const checkModelConfigs = (value: unknown): value is ModelConfigsState => {
	if (!isPlainObject(value)) return false;
	const state = value as Record<string, unknown>;
	return (
		Array.isArray(state.configs) &&
		state.configs.every(isModelConfig) &&
		(state.selectedId === undefined || typeof state.selectedId === 'string')
	);
};

export class ModelConfigsStore {
	private readonly enqueue = createAsyncQueue();
	private readonly persist: MementoPersist<ModelConfigsState>;

	constructor(context: vscode.ExtensionContext) {
		this.persist = new MementoPersist<ModelConfigsState>({
			memento: context.globalState,
			storeKey: MODEL_CONFIGS_STORAGE_KEY,
			check: checkModelConfigs,
		});
	}

	async list(): Promise<ModelConfigSummary[]> {
		return (await this.readState()).configs.map((item) => omit(item, 'apiKey'));
	}

	async get(id: string): Promise<ModelConfig | undefined> {
		const { configs } = await this.readState();
		return configs.find((config) => config.id === id);
	}

	async getSelected(): Promise<ModelConfig | undefined> {
		const { selectedId, configs } = await this.readState();
		return configs.find((config) => config.id === selectedId);
	}

	async select(id: string): Promise<void> {
		return this.enqueue(async () => {
			const state = await this.readState();
			if (!state.configs.some((config) => config.id === id)) {
				throw new Error(`Model configuration with id ${id} not found`);
			}
			if (state.selectedId !== id) await this.persist.write({ ...state, selectedId: id });
		});
	}

	async append(item: ModelConfig): Promise<void> {
		return this.enqueue(async () => {
			const { configs, selectedId } = await this.readState();
			if (configs.find((config) => config.id === item.id)) {
				throw new Error(`Model configuration with id ${item.id} already exists`);
			}
			await this.persist.write({ configs: [...configs, item], selectedId: selectedId ?? item.id });
		});
	}

	async update(id: string, data: Partial<ModelConfig>): Promise<void> {
		return this.enqueue(async () => {
			const state = await this.readState();
			const index = state.configs.findIndex((config) => config.id === id);
			if (index === -1) {
				throw new Error(`Model configuration with id ${id} not found`);
			}
			if (Object.keys(data).length > 0) {
				const configs = state.configs.map((config, itemIndex) =>
					itemIndex === index ? { ...config, ...data } : config,
				);
				await this.persist.write({ ...state, configs });
			}
		});
	}

	async delete(id: string): Promise<void> {
		return this.enqueue(async () => {
			const state = await this.readState();
			if (!state.configs.some((config) => config.id === id)) {
				throw new Error(`Model configuration with id ${id} not found`);
			}
			const configs = state.configs.filter((config) => config.id !== id);
			await this.persist.write({
				configs,
				selectedId: state.selectedId === id ? configs[0]?.id : state.selectedId,
			});
		});
	}

	async clear(): Promise<void> {
		return this.enqueue(() => this.persist.delete());
	}

	private async readState(): Promise<ModelConfigsState> {
		const state = (await this.persist.read()) ?? { configs: [] };
		const selectedId = state.configs.some(({ id }) => id === state.selectedId)
			? state.selectedId
			: state.configs[0]?.id;
		return { ...state, selectedId };
	}
}
