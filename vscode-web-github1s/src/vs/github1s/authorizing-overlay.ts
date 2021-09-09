/* eslint-disable header/header */
/**
 * @file authorizing overlay
 * @author netcon
 */

import { commands } from 'vs/workbench/workbench.web.api';
import { getGitHubAccessToken, AuthMessageData } from 'vs/github1s/authorizing-github';
import 'vs/css!./authorizing-overlay';

const AUTHORIZING_DIALOG_HTML = `
<div class="github1s-authorizing-dialog">
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
		<button class="authorizing-button loading">
			<svg class="github-logo" height="32" viewBox="0 0 16 16" version="1.1" width="32" aria-hidden="true">
				<path fill-rule="evenodd"
					d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z">
				</path>
			</svg>
			<span>Connect to GitHub</span>
		</button>
		<div class="split-line"></div>
		<form class="input-oauth-token-form">
			<input class="input-box" placeholder="Input OAuth Token" />
			<button type="submit" class="submit-button loading">Submit</button>
		</form>
		<div class="create-token-link">
			<a class="link" href="https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s" target="_blank">
				Create New OAuth Token
			</a>
		</div>
	</div>
</div>
`;

/**
 * `AuthorizingOverlay.getInstance().show()` will open a dialog
 * and mask the entire page, It returns a Promise of `AuthMessageData`.
 */
export class AuthorizingOverlay {
	private static _instance: AuthorizingOverlay;
	private _overlayVisible: boolean = false;
	private _rootElement?: HTMLDivElement;
	private _finishCallback: (result: AuthMessageData) => void = () => {};

	// only one overlay instance should be exists
	public static getInstance() {
		if (AuthorizingOverlay._instance) {
			return AuthorizingOverlay._instance;
		}
		return AuthorizingOverlay._instance = new AuthorizingOverlay();
	}

	// show the authorizing overlay
	public show() {
		if (this._overlayVisible === true) {
			return;
		}
		this._overlayVisible = true;
		// add `github1s-overlay-visible` to document.body for `filter: blur(2px)`
		document.body.classList.add('github1s-overlay-visible');
		document.body.appendChild(this.getRootElement());
		this.clearAllErrors();
		return new Promise<AuthMessageData>(resolve => (this._finishCallback = resolve));
	}

	// hide the authorizing overlay
	public hide() {
		if (this._overlayVisible === false) {
			return;
		}
		this._overlayVisible = false;
		const dialogElement = this.getDialogElement();
		// run the exiting animation and waiting 0.18s for finishing it
		dialogElement.classList.add('exiting');
		setTimeout(() => {
			dialogElement.classList.remove('exiting');
			document.body.classList.remove('github1s-overlay-visible');
			document.body.removeChild(this.getRootElement());
		}, 180);
	}

	// get the root html element of the overlay, there would not
	// create dom repeatedly, just cache it in the first time
	private getRootElement(): HTMLDivElement {
		if (!this._rootElement) {
			this._rootElement = this.createElements();
			this.registerListeners();
		}
		return this._rootElement;
	}

	// get dialog html element
	private getDialogElement(): HTMLDivElement {
		return this.getRootElement().querySelector('.github1s-authorizing-dialog')!;
	}

	// create necessary doms
	private createElements(): HTMLDivElement {
		const element = document.createElement('div');

		element.classList.add('github1s-authorizing-mask');
		element.innerHTML = AUTHORIZING_DIALOG_HTML;
		return element;
	}

	// create a html element to show error messages
	private createErrorElement(description: string, link?: string) {
		const element = document.createElement('div');

		element.classList.add('error-message');
		element.innerText = description;
		if (link) {
			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', link);
			linkElement.setAttribute('target', '_blank');
			linkElement.classList.add('link');
			linkElement.innerText = 'See more';
			element.appendChild(linkElement);
		}
		return element;
	};

	// clear all exists error messages
	private clearAllErrors() {
		this.getDialogElement().querySelectorAll('.error-message')?.forEach(element => {
			element.parentElement?.removeChild(element);
		})
	}

	// set the error message for the Authorizing Button
	private setAuthorizingButtonError(description: string, link?: string) {
		this.clearAllErrors();
		const errorElement = this.createErrorElement(description, link);
		this.getDialogElement().querySelector('.authorizing-button')?.insertAdjacentElement('afterend', errorElement);
	}

	// handle the event when user click the Authorizing Button
	private async handleClickAuthorizingButton() {
		// open the authorizing window
		const data = await getGitHubAccessToken(false);

		if ('access_token' in data) {
			// we got the token here!
			this._finishCallback(data);
			return true;
		}
		if ('error' in data) {
			this.setAuthorizingButtonError(data.error_description, data.error_uri);
		}
		return false;
	}

	// set the error message for the input box where user can input token manually
	private setSubmitTokenError(description: string, link?: string) {
		this.clearAllErrors();
		const errorElement = this.createErrorElement(description, link);
		this.getDialogElement().querySelector('.create-token-link')?.insertAdjacentElement('afterend', errorElement);
	}

	// handle the event when user click the submit button for token input box
	private async handleClickSubmitTokenButton() {
		const token = (this.getDialogElement().querySelector('.input-oauth-token-form .input-box') as HTMLInputElement)?.value;

		if (!token) {
			this.setSubmitTokenError('Please input the token');
			return false;
		}

		type ValidateResult = { valid: boolean; remaining: number; };
		const tokenStatus = (await commands.executeCommand('github1s.validate-token', token, true)) as ValidateResult;

		if (!tokenStatus.valid) {
			this.setSubmitTokenError('The token is invalid');
			return false;
		}

		if (tokenStatus.remaining <= 0) {
			this.setSubmitTokenError('The token is valid, but it has exceeded the rate limit');
			return false;
		}

		// we got the token here!
		this._finishCallback({ access_token: token });
		return true;
	}

	// register the event listeners
	private registerListeners() {
		const dialogElement = this.getDialogElement();

		// close the dialog
		dialogElement.querySelector('.close-button')?.addEventListener('click', () => {
			this._finishCallback({ error: 'user_canceled', error_description: 'Authorizing canceled' });
			this.hide();
		});

		// click the authorizing button
		const authorizingButtonElement = dialogElement.querySelector('.authorizing-button');
		authorizingButtonElement?.addEventListener('click', async () => {
			this.clearAllErrors();
			authorizingButtonElement.setAttribute('disabled', 'disabled');
			// if authorizing successful, then hide the dialog
			(await this.handleClickAuthorizingButton()) && this.hide();
			authorizingButtonElement.removeAttribute('disabled');
		});

		// submit the manually entered token
		const submitTokenButtonElement = dialogElement.querySelector('.input-oauth-token-form .submit-button');
		submitTokenButtonElement?.addEventListener('click', async (event: Event) => {
			event.preventDefault();
			this.clearAllErrors();
			submitTokenButtonElement.setAttribute('disabled', 'disabled');
			// if authorizing successful, then hide the dialog
			(await this.handleClickSubmitTokenButton()) && this.hide();
			submitTokenButtonElement.removeAttribute('disabled');
		});
	}
}

export const getGitHubAccessTokenWithOverlay = () => AuthorizingOverlay.getInstance().show();
export const hideAuthorizingOverlay = () => AuthorizingOverlay.getInstance().hide();
