/**
 * @file async related helpers
 */

// below code is comes from:
//https://github.com/microsoft/vscode/blob/a3415e669a8f3879c290af5616a8ed45dd0534af/src/vs/base/common/async.ts#L344
export class Barrier {
	private _isOpen: boolean;
	private _promise: Promise<boolean>;
	private _completePromise!: (v: boolean) => void;

	constructor(timeout = 0) {
		this._isOpen = false;
		this._promise = new Promise<boolean>((c, e) => {
			this._completePromise = c;
		});
		timeout && setTimeout(() => this.open(), timeout);
	}

	isOpen(): boolean {
		return this._isOpen;
	}

	open(): void {
		this._isOpen = true;
		this._completePromise(true);
	}

	wait(): Promise<boolean> {
		return this._promise;
	}
}
