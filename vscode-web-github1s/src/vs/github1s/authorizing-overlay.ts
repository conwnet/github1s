/**
 * @file authorizing overlay
 * @author netcon
 */

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

		this._overlayVisible = true;
		document.body.classList.add('github1s-overlay-visible');
		document.body.appendChild(this.getRootElement());
	}

	// hide the authorizing overlay
	public hide() {
		if (this._overlayVisible === false) {
			return;
		}

		this._overlayVisible = false;
		document.body.classList.remove('github1s-overlay-visible');
		document.body.removeChild(this.getRootElement());
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

		return element;
	}
}

export const showAuthorizingOverlay = () => AuthorizingOverlay.getInstance().show();
export const hideAuthorizingOverlay = () => AuthorizingOverlay.getInstance().hide();

// showAuthorizingOverlay();
