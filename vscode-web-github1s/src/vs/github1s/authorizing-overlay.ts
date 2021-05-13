/**
 * @file authorizing overlay
 * @author netcon
 */

import { commands } from 'vs/workbench/workbench.web.api';
import 'vs/css!./authorizing-overlay';

export class AuthorizingOverlay {
	private static _instance: AuthorizingOverlay;
	private _overlayVisible: boolean;
	private _maskElement?: HTMLDivElement;
	private _dialogElement?: HTMLDivElement;

	public static getInstance() {
		if (AuthorizingOverlay._instance) {
			return AuthorizingOverlay._instance;
		}
		return AuthorizingOverlay._instance = new AuthorizingOverlay();
	}

	private constructor() {
		this._overlayVisible = false;
	}

	// show the authorizing overlay
	public show() {
		if (this._overlayVisible === true) {
			return;
		}

		document.body.classList.add('github1s-overlay-visible');
		document.body.appendChild(this.getRootElement());
		this._dialogElement?.classList.add('visible');
		this._overlayVisible = true;
	}

	// hide the authorizing overlay
	public hide() {
		if (this._overlayVisible === false) {
			return;
		}

		this._dialogElement?.classList.remove('visible');
		// waiting the exit animate for 0.1s
		setTimeout(() => {
			document.body.classList.remove('github1s-overlay-visible');
			document.body.removeChild(this.getRootElement());
			this._overlayVisible = false;
		}, 100);
	}

	private getRootElement() {
		if (!this._maskElement) {
			this._maskElement = this.renderMask();
		}

		if (!this._dialogElement) {
			this._dialogElement = this.renderDialog();
			this._maskElement.appendChild(this._dialogElement);
		}

		return this._maskElement;
	}

	private renderMask(): HTMLDivElement {
		const element = document.createElement('div');
		element.classList.add('github1s-authorizing-mask');

		return element;
	}

	private renderDialog(): HTMLDivElement {
		const element = document.createElement('div');
		element.classList.add('github1s-authorizing-dialog');

		element.innerHTML = `
			<div class="close-button"></div>
			<div class="header-title">
				Authenticating to GitHub
			</div>
			<div class="features-description">
				<ul class="feature-list">
					<li class="feature-item">
						<a class="link" href="https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting" target="_blank">Higher Rate Limit</a>
					</li>
					<li class="feature-item">
						<a class="link" href="https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql" target="_blank">GitHub GraphQL API</a>
					</li>
					<li class="feature-item">
						<a class="link" href="https://docs.github.com/en/graphql/reference/objects#blame" target="_blank">Git Blame Feature</a>
					</li>
				</ul>
			</div>
			<div class="github-documentation">
				Read more about this on
				<a class="link"
					href="https://docs.github.com/en/github/authenticating-to-github"
					target="_blank">
					GitHub Documentation
				</a>
			</div>
			<div class="authorizing-methods">
				<button class="authorizing-button">
					<svg class="github-logo" height="32" viewBox="0 0 16 16" version="1.1"
						width="32" aria-hidden="true">
						<path fill-rule="evenodd"
							d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z">
						</path>
					</svg>
					<span>Connect to GitHub</span>
				</button>
				<div class="split-line"></div>
				<form class="input-oauth-token-form">
					<input class="input-box" placeholder="Input OAuth Token" />
					<button type="submit" class="submit-button">Submit</button>
				</form>
				<div class="create-token-link">
					<a class="link" href="https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s" target="_blank">
						Create New OAuth Token
					</a>
				</div>
			</div>
		`;

		return element;
	}
}

(window as any).commands = commands;

export const showAuthorizingOverlay = () => AuthorizingOverlay.getInstance().show();
export const hideAuthorizingOverlay = () => AuthorizingOverlay.getInstance().hide();
