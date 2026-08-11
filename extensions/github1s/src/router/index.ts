/**
 * @file GitHub url router (just like react-router)
 * @author netcon
 */

import * as vscode from 'vscode';
import { History, createMemoryHistory, parsePath, Action } from 'history';
import { Adapter, RouterParser, RouterState } from '@/adapters/types';
import { Barrier } from '@/helpers/async';
import adapterManager from '@/adapters/manager';
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
	private _adapter: Adapter | null = null;
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
		this._adapter = adapterManager.getCurrentAdapter();
		const { path: pathname, query, fragment } = vscode.Uri.parse(await this._manager.href());
		const path = pathname + (query ? `?${query}` : '') + (fragment ? `#${fragment}` : '');

		this._parser = await this._adapter.resolveRouterParser();
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
	public getState(): RouterState & { scheme: string } {
		return { ...this._state!, scheme: this._adapter!.scheme };
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
		const scheme = uri.scheme;
		const [repo, ref] = uri.authority ? uri.authority.split('+') : [this._state!.repo, this._state!.ref];
		return { scheme, repo, ref, path: uri.path || '/' };
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
			const repo = state.repo || base?.authority.split('+')[0] || this._state!.repo;
			mergedState.authority = repo && state.ref ? `${repo}+${state.ref}` : '';
		}
		if (state?.hasOwnProperty('path')) {
			mergedState.path = `/${state.path?.split('/').filter(Boolean).join('/') || ''}`;
		}

		return base
			? base.with(mergedState)
			: vscode.Uri.from({ scheme: adapterManager.getCurrentScheme(), path: '/', ...mergedState });
	}
}

export default Router.getInstance();
