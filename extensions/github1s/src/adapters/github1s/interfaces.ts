/**
 * @file token related interfaces
 * @author netcon
 */

import * as vscode from 'vscode';
import { throttle } from '@/helpers/func';

const throttledReportNetworkError = throttle(() => {
	vscode.window.showErrorMessage('Request Failed, Maybe an Network Error');
}, 5000);

export const validateToken = (token: string) => {
	const authHeaders: Record<string, string> = token ? { Authorization: `token ${token}` } : {};
	return self
		.fetch(`https://api.github.com/`, { headers: { ...authHeaders } })
		.then((response) => ({
			token: !!token, // if the token is not empty
			valid: response.status !== 401 ? true : false, // if the request is valid
			limit: +response.headers.get('X-RateLimit-Limit')! || 0, // limit count
			remaining: +response.headers.get('X-RateLimit-Remaining')! || 0, // remains request count
			reset: +response.headers.get('X-RateLimit-Reset')! || 0, // reset time
		}))
		.catch((error) => {
			throttledReportNetworkError();
			throw error;
		});
};
