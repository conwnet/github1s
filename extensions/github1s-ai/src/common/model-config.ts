import { isPlainObject } from 'lodash-es';

export const MODEL_PROTOCOL_IDS = ['openai-responses', 'openai-chat', 'anthropic-messages'] as const;

export type ModelProtocol = (typeof MODEL_PROTOCOL_IDS)[number];

export const MODEL_PROTOCOL_LABELS: Record<ModelProtocol, string> = {
	'openai-responses': 'OpenAI Responses',
	'openai-chat': 'OpenAI Chat Completions',
	'anthropic-messages': 'Anthropic Messages',
};

export const MODEL_PROVIDER_IDS = ['custom', 'openai', 'anthropic'] as const;

/** Identifies the API service or routing platform a model configuration connects to. */
export type ModelProvider = (typeof MODEL_PROVIDER_IDS)[number];

interface ModelProviderDefinition {
	label: string;
	protocols: readonly [ModelProtocol, ...ModelProtocol[]];
	defaultBaseURL?: string;
	modelIdPlaceholder: string;
}

export const MODEL_PROVIDERS: Record<ModelProvider, ModelProviderDefinition> = {
	custom: {
		label: 'Custom',
		protocols: ['openai-chat', 'openai-responses', 'anthropic-messages'],
		modelIdPlaceholder: 'model-id',
	},
	openai: {
		label: 'OpenAI',
		protocols: ['openai-responses', 'openai-chat'],
		defaultBaseURL: 'https://api.openai.com/v1',
		modelIdPlaceholder: 'gpt-5.6-luna',
	},
	anthropic: {
		label: 'Anthropic',
		protocols: ['anthropic-messages'],
		defaultBaseURL: 'https://api.anthropic.com/v1',
		modelIdPlaceholder: 'claude-haiku-4-5',
	},
};

export const isModelProvider = (value: unknown): value is ModelProvider =>
	typeof value === 'string' && MODEL_PROVIDER_IDS.some((provider) => provider === value);

export const isModelProtocol = (value: unknown): value is ModelProtocol =>
	typeof value === 'string' && MODEL_PROTOCOL_IDS.some((protocol) => protocol === value);

export const isProtocolSupportedByProvider = (provider: ModelProvider, protocol: ModelProtocol): boolean =>
	MODEL_PROVIDERS[provider].protocols.some((candidate) => candidate === protocol);

export interface ModelConfig {
	id: string;
	name: string;
	provider: ModelProvider;
	protocol: ModelProtocol;
	baseURL: string;
	apiKey: string;
	modelId: string;
}

export type ModelConfigSummary = Omit<ModelConfig, 'apiKey'>;

export type ModelConfigInput = Omit<ModelConfig, 'id'> & { id?: string };

export const isModelConfigInput = (value: unknown): value is ModelConfigInput => {
	if (!isPlainObject(value)) return false;
	const config = value as Record<string, unknown>;
	const allowed = new Set(['id', 'name', 'provider', 'protocol', 'baseURL', 'apiKey', 'modelId']);
	if (
		Object.keys(config).some((key) => !allowed.has(key)) ||
		!['name', 'provider', 'protocol', 'baseURL', 'apiKey', 'modelId'].every((key) =>
			Object.prototype.hasOwnProperty.call(config, key),
		) ||
		!isNonEmptyString(config.name) ||
		!isModelProvider(config.provider) ||
		!isModelProtocol(config.protocol) ||
		!isProtocolSupportedByProvider(config.provider, config.protocol) ||
		!isValidBaseURL(config.baseURL) ||
		typeof config.apiKey !== 'string' ||
		!isNonEmptyString(config.modelId) ||
		(config.id !== undefined && !isNonEmptyString(config.id))
	) {
		return false;
	}
	return true;
};

export const isModelConfig = (value: unknown): value is ModelConfig => {
	return isModelConfigInput(value) && value.id !== undefined && value.apiKey.trim().length > 0;
};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isValidBaseURL = (value: unknown): value is string => {
	if (!isNonEmptyString(value)) return false;
	let parsed: URL;

	try {
		parsed = new URL(value);
	} catch {
		return false;
	}

	return (
		(parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
		!parsed.username &&
		!parsed.password &&
		!parsed.search &&
		!parsed.hash
	);
};
