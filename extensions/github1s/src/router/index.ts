/**
 * @file GitHub url router (just like react-router)
 * @author netcon
 */

import * as vscode from 'vscode';
import { History, createMemoryHistory } from 'history';
import platformAdapterManager from '@/adapters/manager';
import { Barrier } from '@/helpers/async';
import { parseGitHubUrl } from './parser';
import { EventEmitter } from './events';
import { RouterState } from './types';

export class Router extends EventEmitter<RouterState> {
	private static instance: Router;

	private readyBarrier = new Barrier();
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
	async initialize(browserUrl: string) {
		const schema = vscode.workspace.workspaceFolders.length
			? vscode.workspace.workspaceFolders[0].uri.scheme
			: 'UNKNOWN';

		const { path, query, fragment } = vscode.Uri.parse(browserUrl);
		const targetPath = path + (query ? `?${query}` : '') + (fragment ? `#${fragment}` : '');
		this.history.replace(targetPath);
		this._currentStatePromise = parseGitHubUrl(targetPath);
		this._previousStatePromise = this._currentStatePromise;
		this.readyBarrier.open();

		this.history.listen(async ({ location }) => {
			const targetPath = `${location.pathname}${location.search}${location.hash}`;
			this._previousStatePromise = this._currentStatePromise;
			this._currentStatePromise = parseGitHubUrl(targetPath);

			// sync path to browser
			vscode.commands.executeCommand('github1s.vscode.replace-browser-url', targetPath);
			this.notifyListeners(await this._previousStatePromise, await this._currentStatePromise);
		});
	}

	// get the routerState for current url
	public async getState(): Promise<RouterState> {
		return this.readyBarrier.wait().then(() => this._currentStatePromise);
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
