import type { LanguageModelUsage } from 'ai';

import type { ConversationMessageMetadata } from '@/common/conversation';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;
const UI_LOCALE = 'en-US';

/**
 * Return the transient status text that belongs beside an assistant response.
 * @param metadata Message status being presented.
 * @returns A short status label, or undefined when no label adds information.
 */
export const messageStatusLabel = (metadata: Pick<ConversationMessageMetadata, 'status'>): string | undefined => {
	if (metadata.status === 'streaming') return 'Generating…';
	if (metadata.status === 'aborted') return 'Stopped';
	if (metadata.status === 'failed') return 'Failed';
	if (metadata.status === 'unknown') return 'Interrupted';
	return undefined;
};

const formatRelativeTime = (updatedAt: number, now = Date.now(), locale: string | string[] = UI_LOCALE): string => {
	if (!Number.isFinite(updatedAt) || !Number.isFinite(now)) return '';
	const delta = updatedAt - now;
	const absolute = Math.abs(delta);
	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	if (absolute < MINUTE_MS) return formatter.format(0, 'second');
	if (absolute < HOUR_MS) return formatter.format(Math.trunc(delta / MINUTE_MS), 'minute');
	if (absolute < DAY_MS) return formatter.format(Math.trunc(delta / HOUR_MS), 'hour');
	if (absolute < MONTH_MS) return formatter.format(Math.trunc(delta / DAY_MS), 'day');
	if (absolute < YEAR_MS) return formatter.format(Math.trunc(delta / MONTH_MS), 'month');
	return formatter.format(Math.trunc(delta / YEAR_MS), 'year');
};

export const formatConversationTime = (
	updatedAt: number,
	now = Date.now(),
	locale: string | string[] = UI_LOCALE,
): { relativeTime: string; dateTime?: string; title?: string } => {
	const date = new Date(updatedAt);
	if (!Number.isFinite(date.getTime())) return { relativeTime: '' };
	return {
		relativeTime: formatRelativeTime(updatedAt, now, locale),
		dateTime: date.toISOString(),
		title: date.toLocaleString(locale),
	};
};

type ConversationUsage = Pick<LanguageModelUsage, 'inputTokens' | 'outputTokens' | 'totalTokens'>;

export interface ConversationUsagePresentation {
	title: string;
	value: string;
}

export const presentConversationUsage = (
	usage: ConversationUsage | undefined,
	locale: string | string[] = UI_LOCALE,
): ConversationUsagePresentation | undefined => {
	if (!usage) return undefined;
	const inputTokens = validTokenCount(usage.inputTokens);
	const outputTokens = validTokenCount(usage.outputTokens);
	const reportedTotal = validTokenCount(usage.totalTokens);
	const totalTokens =
		reportedTotal ?? (inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined);
	if (totalTokens === undefined) return undefined;

	const exact = new Intl.NumberFormat(locale);
	const compact = new Intl.NumberFormat(locale, {
		notation: 'compact',
		compactDisplay: 'short',
		maximumFractionDigits: 1,
	});
	const details = [
		`${exact.format(totalTokens)} tokens total`,
		...(inputTokens === undefined ? [] : [`${exact.format(inputTokens)} input`]),
		...(outputTokens === undefined ? [] : [`${exact.format(outputTokens)} output`]),
	];

	return {
		title: `Conversation usage: ${details.join(' · ')}`,
		value: compact.format(totalTokens),
	};
};

const validTokenCount = (value: number | undefined): number | undefined =>
	value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
