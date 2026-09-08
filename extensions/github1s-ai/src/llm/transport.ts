/* eslint-disable jsdoc/require-jsdoc -- Transport helpers are named and covered by their types. */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
	readUIMessageStream,
	stepCountIs,
	streamText,
	toUIMessageStream,
	type LanguageModelUsage,
	type LanguageModel,
	type ModelMessage,
	type ToolSet,
} from 'ai';

import type { ConversationMessage } from '@/common/conversation';
import type { ModelConfig } from '@/common/model-config';
import { createBasicTools } from '@/tools';

interface AgentTransportOptions {
	fetch?: typeof globalThis.fetch;
	instructions: string;
	responseMessage: ConversationMessage;
	tools?: ToolSet;
}

const basicTools = createBasicTools();

export interface AgentStream {
	stream: AsyncIterable<ConversationMessage>;
	usage: PromiseLike<LanguageModelUsage>;
}

export function streamLLMAgent(
	config: ModelConfig,
	messages: ModelMessage[],
	signal: AbortSignal,
	options: AgentTransportOptions,
): AgentStream {
	try {
		const tools = { ...basicTools, ...options.tools };
		const result = streamText({
			model: createLanguageModel(config, options.fetch),
			instructions: options.instructions,
			messages,
			tools,
			stopWhen: stepCountIs(20),
			abortSignal: signal,
			onError: () => undefined,
		});
		const uiStream = toUIMessageStream<typeof tools, ConversationMessage>({
			stream: result.stream,
			tools,
			generateMessageId: () => options.responseMessage.id,
			onError: (error) => sanitizeProviderError(error, [config.apiKey]).message,
		});
		const messageStream = readUIMessageStream<ConversationMessage>({
			message: structuredClone(options.responseMessage),
			stream: uiStream,
			terminateOnError: true,
		});

		return {
			stream: messageStream,
			get usage() {
				return Promise.resolve(result.usage).catch((error) => {
					if (signal.aborted) throw error;
					throw sanitizeProviderError(error, [config.apiKey]);
				});
			},
		};
	} catch (error) {
		if (signal.aborted) {
			throw error;
		}
		throw sanitizeProviderError(error, [config.apiKey]);
	}
}

const createLanguageModel = (config: ModelConfig, fetch?: typeof globalThis.fetch): LanguageModel => {
	switch (config.protocol) {
		case 'openai-responses':
			return createOpenAI({
				baseURL: config.baseURL,
				apiKey: config.apiKey,
				fetch,
			}).responses(config.modelId);
		case 'openai-chat':
			if (config.provider === 'openai') {
				return createOpenAI({
					baseURL: config.baseURL,
					apiKey: config.apiKey,
					fetch,
				}).chat(config.modelId);
			}
			return createOpenAICompatible({
				name: config.provider,
				baseURL: config.baseURL,
				apiKey: config.apiKey,
				fetch,
				includeUsage: true,
			})(config.modelId);
		case 'anthropic-messages':
			return createAnthropic({
				baseURL: config.baseURL,
				apiKey: config.apiKey,
				fetch,
				headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
			})(config.modelId);
	}
};

const sanitizeProviderError = (error: unknown, secrets: readonly string[] = []): Error => {
	const status = readStatus(error);
	if (status === 401 || status === 403) {
		return new Error('Authentication failed. Check the API key for the selected model.');
	}
	if (status === 404) {
		return new Error('The endpoint or model was not found. Check the Base URL and model ID.');
	}
	if (status === 429) {
		return new Error('The endpoint rate limit was reached. Try again later.');
	}
	if (status !== undefined) {
		return new Error(`The AI endpoint returned HTTP ${status}.`);
	}
	if (isBrowserNetworkError(error)) {
		return new Error('Unable to reach the AI endpoint from this browser. Check the Base URL and CORS settings.');
	}

	const detail = error instanceof Error ? error.message : 'Unknown error.';
	return new Error(`AI request failed: ${redactSecrets(detail, secrets)}`);
};

const readStatus = (error: unknown): number | undefined => {
	if (typeof error !== 'object' || error === null) {
		return undefined;
	}

	const candidate = error as { statusCode?: unknown; status?: unknown };
	for (const field of ['statusCode', 'status'] as const) {
		const value = candidate[field];
		if (typeof value === 'number' && Number.isInteger(value)) {
			return value;
		}
	}
	return undefined;
};

const isBrowserNetworkError = (error: unknown): boolean => {
	let current = error;
	const visited = new Set<unknown>();

	while (current !== undefined && current !== null && !visited.has(current)) {
		if (current instanceof TypeError) {
			return true;
		}
		visited.add(current);
		current = typeof current === 'object' && 'cause' in current ? current.cause : undefined;
	}
	return false;
};

const redactSecrets = (message: string, secrets: readonly string[]): string => {
	let redacted = message;
	for (const secret of secrets) {
		if (secret) {
			redacted = redacted.split(secret).join('[redacted]');
		}
	}
	return redacted.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
};
