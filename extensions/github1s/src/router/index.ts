/**
 * @file GitHub url router (just like react-router)
 * @author netcon
 */

import * as vscode from 'vscode';
import { getAdapter } from '@/adapters';
import { History, createMemoryHistory, parsePath, Action } from 'history';
import { RouterParser, RouterState } from '@/adapters/types';
import { buildAuthority, parseAuthority } from './authority';
import { EventEmitter } from './events';

export interface UrlManager {
	href: () => string | Promise<string>; // get href
	push: (url: string) => void | Promise<void>;
	replace: (url: string) => void | Promise<void>;
}

export interface UriState {
	scheme: string;
	repo: string;
	ref: string;
	path: string;
}

export class Router extends EventEmitter<RouterState> {
	private static instance: Router;

	private _state: RouterState | null = null;
	private _history: History | null = null;
	private _parser: RouterParser | null = null;
	private _manager: UrlManager | null = null;

	public static getInstance() {
		if (Router.instance) {
			return Router.instance;
		}
		return (Router.instance = new Router());
	}

	// initialize the router with current url in browser
	// must be called before any other method is called
	async initialize(urlManager: UrlManager) {
		this._manager = urlManager;
		const { path: pathname, query, fragment } = vscode.Uri.parse(await this._manager.href());
		const path = pathname + (query ? `?${query}` : '') + (fragment ? `#${fragment}` : '');

		this._parser = await getAdapter().resolveRouterParser();
		this._state = await this._parser.parsePath(path);
		this._history = createMemoryHistory({ initialEntries: [path] });

		this._history.listen(async ({ action, location }) => {
			const prevState = this._state;
			const targetPath = `${location.pathname}${location.search}${location.hash}`;

			this._manager?.[action === Action.Push ? 'push' : 'replace'](targetPath);
			this._state = await this._parser!.parsePath(targetPath);
			super.notifyListeners(this._state, prevState);
		});
	}

	// get the routerState for current url
	public getState(): RouterState {
		return { ...this._state! };
	}

	public getHistory() {
		return this._history!;
	}

	public getPath() {
		const { pathname, search, hash } = this._history!.location;
		return `${pathname}${search}${hash}`;
	}

	// push the url with current history
	public push(path: string) {
		const emptyState = { pathname: '', search: '', hash: '' };
		return this._history!.push({ ...emptyState, ...parsePath(encodeURI(path)) });
	}

	// replace the url with current history
	public replace(path: string) {
		const emptyState = { pathname: '', search: '', hash: '' };
		return this._history!.replace({ ...emptyState, ...parsePath(encodeURI(path)) });
	}

	public getParser(): RouterParser {
		return this._parser!;
	}

	public async href(): Promise<string | undefined> {
		return this._manager?.href();
	}

	public parseUri(uri: vscode.Uri): UriState {
		const { repo, ref } = parseAuthority(uri.authority) || this._state!;
		return { scheme: uri.scheme, repo, ref, path: uri.path || '/' };
	}

	public buildUri(state?: Partial<UriState>, base?: vscode.Uri): vscode.Uri {
		const mergedState: Parameters<NonNullable<typeof base>['with']>[0] = {};

		if (state?.hasOwnProperty('scheme')) {
			mergedState.scheme = state.scheme || '';
		}
		if (state && state.repo && !state.ref) {
			throw new Error('ref is required when repo is provided');
		}
		if (state?.hasOwnProperty('ref')) {
			const repo = state.repo || parseAuthority(base?.authority || '')?.repo || this._state!.repo;
			mergedState.authority = buildAuthority(repo, state.ref || '');
		}
		if (state?.hasOwnProperty('path')) {
			mergedState.path = `/${state.path?.split('/').filter(Boolean).join('/') || ''}`;
		}

		return base ? base.with(mergedState) : vscode.Uri.from({ scheme: getAdapter().scheme, path: '/', ...mergedState });
	}
}

export default Router.getInstance();
