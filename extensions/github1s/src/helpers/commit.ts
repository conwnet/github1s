/**
 * @file Commit display helpers
 */

import type { Commit } from '@/adapters/types';
import { relativeTimeTo, toISOString } from './date';

export const getCommitDescription = (commit: Commit): string => {
	const shortCommitSha = commit.sha.slice(0, 7);
	const relativeTimeStr = commit.createTime ? relativeTimeTo(commit.createTime) : null;
	return [shortCommitSha, commit.author, relativeTimeStr].filter(Boolean).join(', ');
};

export const getCommitTooltip = (commit: Commit): string => {
	const shortCommitSha = commit.sha.slice(0, 7);
	const ISOTimeStr = commit.createTime ? toISOString(commit.createTime) : null;
	const detailText = [shortCommitSha, commit.author, ISOTimeStr].filter(Boolean).join(', ');
	return `${commit.message}\n(${detailText})`;
};
