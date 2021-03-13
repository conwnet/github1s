/**
 * @file Observable
 * @author netcon
 */

export class EventEmitter<T> {
	private _listeners: ((...args: T[]) => any)[] = [];

	public addListener(listener) {
		this._listeners.push(listener);
		return () => this.removeListener(listener);
	}

	public removeListener(listener) {
		const index = this._listeners.indexOf(listener);
		return index >= 0 && this._listeners.splice(index, 1);
	}

	public notifyListeners(...args) {
		this._listeners.forEach((listener) => listener(...args));
	}
}
