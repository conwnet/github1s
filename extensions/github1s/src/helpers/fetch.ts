/**
 * @file github1s fetch api
 * @author netcon
 */

import * as vscode from 'vscode';
import { throttle } from './func';
import { getExtensionContext } from './context';

const getGitHubAuthToken = (): string => {
	const context = getExtensionContext();
	return context?.globalState.get('github-oauth-token') || '';
};

export class RequestError extends Error {
	constructor(message: string, public token: string) {
		super(message);
		if (typeof (<any>Object).setPrototypeOf === 'function') {
			(<any>Object).setPrototypeOf(this, RequestError.prototype);
		}
	}
}

export class RequestNotFoundError extends RequestError {
	constructor(message: string, token: string) {
		super(message, token);
		if (typeof (<any>Object).setPrototypeOf === 'function') {
			(<any>Object).setPrototypeOf(this, RequestNotFoundError.prototype);
		}
	}
}

export class RequestRateLimitError extends RequestError {
	constructor(message: string, token: string) {
		super(message, token);
		if (typeof (<any>Object).setPrototypeOf === 'function') {
			(<any>Object).setPrototypeOf(this, RequestRateLimitError.prototype);
		}
	}
}

export class RequestInvalidTokenError extends RequestError {
	constructor(message: string, token: string) {
		super(message, token);
		if (typeof (<any>Object).setPrototypeOf === 'function') {
			(<any>Object).setPrototypeOf(this, RequestInvalidTokenError.prototype);
		}
	}
}

// only report network error once in 5 seconds
export const throttledReportNetworkError = throttle(
	() =>
		vscode.window.showErrorMessage('Request Failed, Maybe an Network Error'),
	5000
);

const cache = new Map();

export const fetch = async (url: string, options?: RequestInit) => {
	const token = getGitHubAuthToken();
	const authHeaders = token ? { Authorization: `token ${token}` } : {};
	const customHeaders = options && 'headers' in options ? options.headers : {};
	if (
		cache.has(url) &&
		!['no-store', 'no-cache', 'reload'].includes(options.cache)
	) {
		return cache.get(url);
	}

	let response: Response;
	try {
		response = await self.fetch(url, {
			mode: 'cors',
			cache: 'force-cache',
			...options,
			headers: { ...authHeaders, ...customHeaders },
		});
	} catch (e) {
		throttledReportNetworkError();
		throw new RequestError('Request Failed, Maybe an Network Error', token);
	}
	if (response.status < 400) {
		cache.set(url, response.json());
		return cache.get(url);
	}
	if (response.status === 403) {
		return response.json().then((data) => {
			throw new RequestRateLimitError(data.message, token);
		});
	}
	if (response.status === 401) {
		return response.json().then((data) => {
			throw new RequestInvalidTokenError(data.message, token);
		});
	}
	if (response.status === 404) {
		throw new RequestNotFoundError('Not Found', token);
	}
	throw new RequestError(
		`GitHub1s: Request got HTTP ${response.status} response`,
		token
	);
};
