/**
 * @file GitHub url router (just like react-router)
 * @author netcon
 */

import * as vscode from 'vscode';
import { History, createMemoryHistory, parsePath, Action } from 'history';
import { RouterParser, RouterState } from '@/adapters/types';
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
	private _parser: RouterParser | null = null;
	// ensure router has been initialized
	private _barrier: Barrier = new Barrier();
	private _manager: UrlManager | null = null;

	public static getInstance() {
		if (Router.instance) {
			return Router.instance;
		}
		return (Router.instance = new Router());
	}

	// initialize the router with current url in browser
	async initialize(urlManager: UrlManager) {
		this._manager = urlManager;
		this._parser = await adapterManager.getCurrentAdapter().resolveRouterParser();
		const { path: pathname, query, fragment } = vscode.Uri.parse(await this._manager.href());
		const path = pathname + (query ? `?${query}` : '') + (fragment ? `#${fragment}` : '');

		this._state = await this._parser.parsePath(path);
		this._history = createMemoryHistory({ initialEntries: [path] });

		this._history.listen(async ({ action, location }) => {
			const prevState = this._state;
			const targetPath = `${location.pathname}${location.search}${location.hash}`;
			const routerParser = await adapterManager.getCurrentAdapter().resolveRouterParser();

			this._manager?.[action === Action.Push ? 'push' : 'replace'](targetPath);
			this._state = await routerParser.parsePath(targetPath);
			super.notifyListeners(this._state, prevState);
		});
		this._barrier.open();
	}

	// get the routerState for current url
	public async getState(): Promise<RouterState> {
		await this._barrier.wait();
		return this._state!;
	}

	// compute the file URI authority of current routerState
	public async getAuthority(): Promise<string> {
		const state = await this.getState();
		return `${state.repo}+${state.ref}`;
	}

	public async getHistory() {
		await this._barrier.wait();
		return this._history!;
	}

	public async getPath() {
		await this._barrier.wait();
		const { pathname, search, hash } = this._history!.location;
		return `${pathname}${search}${hash}`;
	}

	// push the url with current history
	public async push(path: string) {
		await this._barrier.wait();
		const emptyState = { pathname: '', search: '', hash: '' };
		return this._history!.push({ ...emptyState, ...parsePath(encodeURI(path)) });
	}

	// replace the url with current history
	public async replace(path: string) {
		await this._barrier.wait();
		const emptyState = { pathname: '', search: '', hash: '' };
		return this._history!.replace({ ...emptyState, ...parsePath(encodeURI(path)) });
	}

	public async resolveParser(): Promise<RouterParser> {
		await this._barrier.wait();
		return this._parser!;
	}

	public async href(): Promise<string | undefined> {
		return this._manager?.href();
	}

	public parseUri(uri?: vscode.Uri): UriState {
		const scheme = uri?.scheme || adapterManager.getCurrentScheme();
		const [repo, ref] = uri?.authority.split('+') || [this._state!.repo, this._state!.ref];
		return { scheme, repo, ref, path: uri?.path || '/' };
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
