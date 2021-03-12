/**
 * @file GitHub url router (just like react-router)
 * @author netcon
 */

import * as vscode from 'vscode';
import { History, createMemoryHistory } from 'history';
import { parseGitHubUrl } from './parser';
import { EventEmitter } from './events';
import { RouterState } from './types';

export class Router extends EventEmitter<RouterState> {
	private static instance: Router;

	private _previousStatePromise: Promise<RouterState>;
	private _currentStatePromise: Promise<RouterState>;
	public history: History = createMemoryHistory();

	public static getInstance() {
		if (Router.instance) {
			return Router.instance;
		}
		return (Router.instance = new Router());
	}

	// we should ensure the router has been initialized at first!
	async initialize() {
		// use the browser url initialize the history
		const browserUrl = (await vscode.commands.executeCommand(
			'github1s.vscode.get-browser-url'
		)) as string;
		const { path, query, fragment } = vscode.Uri.parse(browserUrl);
		const targetPath =
			path + (query ? `?${query}` : '') + (fragment ? `#${fragment}` : '');
		this.history.replace(targetPath);
		this._currentStatePromise = parseGitHubUrl(targetPath);
		this._previousStatePromise = this._currentStatePromise;

		this.history.listen(async ({ location }) => {
			const targetPath = `${location.pathname}${location.search}${location.hash}`;
			this._previousStatePromise = this._currentStatePromise;
			this._currentStatePromise = parseGitHubUrl(targetPath);

			// sync path to browser
			vscode.commands.executeCommand(
				'github1s.vscode.replace-browser-url',
				targetPath
			);
			this.notifyListeners(
				await this._previousStatePromise,
				await this._currentStatePromise
			);
		});
	}

	// get the routerState for current url
	public async getState(): Promise<RouterState> {
		return this._currentStatePromise;
	}

	// compute the file URI authority of current routerState
	public async getAuthority(): Promise<string> {
		return this.getState().then(({ owner, repo, ref }) => {
			return `${owner}+${repo}+${ref}`;
		});
	}

	// replace the url of the history
	public async replace(path: string) {
		return this.history.replace(path);
	}
}

export default Router.getInstance();
