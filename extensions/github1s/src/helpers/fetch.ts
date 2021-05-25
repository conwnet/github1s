/**
 * @file github1s fetch api
 * @author netcon
 */

import * as vscode from 'vscode';
import { reuseable, throttle } from './func';
import { getOAuthToken } from './context';
import { noop } from './util';

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

export const getFetchOptions = (forceUpdate?: boolean): RequestInit => {
	if (forceUpdate) {
		return { cache: 'reload' };
	}
};

const cache = new Map();

const isGitHubApi = (url: string) => url.startsWith('https://api.github.com/');

export const fetch = reuseable(async (url: string, options?: RequestInit) => {
	const token = getOAuthToken();
	const authHeaders =
		token && isGitHubApi(url) ? { Authorization: `token ${token}` } : {};
	const customHeaders = options && 'headers' in options ? options.headers : {};
	/**
	 * We are reusing the same values from the https://developer.mozilla.org/en-US/docs/Web/API/Request/cache.
	 * But the way is not the same because we couldn't control how the cache-control returns from external APIs.
	 * Instead of relying on the browser caching stragety and API resposne header, we use an im-memory map to
	 * cache all requests.
	 */
	if (
		cache.has(url) &&
		!['no-store', 'no-cache', 'reload'].includes(options?.cache)
	) {
		return cache.get(url);
	}

	let response: Response;
	try {
		response = await self.fetch(url, {
			mode: 'cors',
			...options,
			headers: { ...authHeaders, ...customHeaders },
		});
	} catch (e) {
		throttledReportNetworkError();
		throw new RequestError('Request Failed, Maybe an Network Error', token);
	}
	if (response.status < 400) {
		cache.set(url, await response.json());
		return cache.get(url);
	}
	if (response.status === 403) {
		// if there is no token saved and the rate limit exceeded,
		// open the authorizing overly for requesting a access token
		if (!token && isGitHubApi(url)) {
			vscode.commands.executeCommand(
				'github1s.authorizing-github-with-overlay'
			);
		}
		return response.json().then((data) => {
			throw new RequestRateLimitError(data.message, token);
		});
	}
	if (response.status === 401) {
		return response.json().then((data) => {
			// current token is invalid
			if (data.message?.includes('Bad credentials')) {
				vscode.commands.executeCommand('github1s.views.settings.focus');
			}
			throw new RequestInvalidTokenError(data.message, token);
		});
	}
	if (response.status === 404) {
		throw new RequestNotFoundError('Not Found', token);
	}
	throw new RequestError(
		(await response.json().catch(noop))?.message ||
			`GitHub1s: Request got HTTP ${response.status} response`,
		token
	);
});
