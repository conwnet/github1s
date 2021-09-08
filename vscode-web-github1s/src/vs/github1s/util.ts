/* eslint-disable header/header */
/**
 * @file github1s common utils
 * @autor netcon
 */

export const getBrowserUrl = (): string => {
	return window.location.href;
};

export const replaceBrowserUrl = (url: string) => {
	if (window.history.replaceState) {
		window.history.replaceState(null, '', url);
	}
};

export const delegate = <K extends keyof HTMLElementEventMap>(
	element: HTMLElement,
	selector: string,
	eventName: K,
	handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
): void => {
	return element?.addEventListener(eventName, function (event) {
		const children = element.querySelectorAll(selector);
		for (let i = 0, len = children.length; i < len; i++) {
			if (children[i] === event.target) {
				handler.call(this, event);
			}
		}
	});
};
