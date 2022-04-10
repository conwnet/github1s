/**
 * @file GitHub url router (just like react-router)
 * @author netcon
 */

import * as vscode from 'vscode';
import { History, createMemoryHistory } from 'history';
import { RouterParser, RouterState } from '@/adapters/types';
import { Barrier } from '@/helpers/async';
import adapterManager from '@/adapters/manager';
import { EventEmitter } from './events';

export interface UrlManager {
	getUrl: () => string | Promise<string>;
	setUrl: (url: string) => void | Promise<void>;
}

export class Router extends EventEmitter<RouterState> {
	private static instance: Router;

	private _state: RouterState | null = null;
	private _history: History | null = null;
	private _parser: RouterParser | null = null;
	// ensure router has been initialized
	private _barrier: Barrier = new Barrier();

	public static getInstance() {
		if (Router.instance) {
			return Router.instance;
		}
		return (Router.instance = new Router());
	}

	// initialize the router with current url in browser
	async initialize(urlManager: UrlManager) {
		this._parser = await adapterManager.getCurrentAdapter().resolveRouterParser();
		const { path: pathname, query, fragment } = vscode.Uri.parse(await urlManager.getUrl());
		const path = pathname + (query ? `?${query}` : '') + (fragment ? `#${fragment}` : '');

		this._state = await this._parser.parsePath(path);
		this._history = createMemoryHistory({ initialEntries: [path] });

		this._history.listen(async ({ location }) => {
			const prevState = this._state;
			const targetPath = `${location.pathname}${location.search}${location.hash}`;
			const routerParser = await adapterManager.getCurrentAdapter().resolveRouterParser();

			urlManager.setUrl(targetPath);
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

	// push the url with current history
	public async push(path: string) {
		await this._barrier.wait();
		return this._history!.push(path);
	}

	// replace the url with current history
	public async replace(path: string) {
		await this._barrier.wait();
		return this._history!.replace(path);
	}

	public async resolveParser(): Promise<RouterParser> {
		await this._barrier.wait();
		return this._parser!;
	}
}

export default Router.getInstance();
