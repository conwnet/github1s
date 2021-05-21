/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

(function () {

	const MonacoEnvironment = (<any>self).MonacoEnvironment;
	const monacoBaseUrl = MonacoEnvironment && MonacoEnvironment.baseUrl ? MonacoEnvironment.baseUrl : '../../../';

	const trustedTypesPolicy = (
		typeof self.trustedTypes?.createPolicy === 'function'
			? self.trustedTypes?.createPolicy('amdLoader', {
				createScriptURL: value => value,
				createScript: (_, ...args: string[]) => {
					// workaround a chrome issue not allowing to create new functions
					// see https://github.com/w3c/webappsec-trusted-types/wiki/Trusted-Types-for-function-constructor
					const fnArgs = args.slice(0, -1).join(',');
					const fnBody = args.pop()!.toString();
					const body = `(function anonymous(${fnArgs}) {\n${fnBody}\n})`;
					return body;
				}
			})
			: undefined
	);

	function loadAMDLoader() {
		return new Promise<void>((resolve, reject) => {
			if (typeof (<any>self).define === 'function' && (<any>self).define.amd) {
				return resolve();
			}
			const loaderSrc: string | TrustedScriptURL = monacoBaseUrl + 'vs/loader.js';

			const isCrossOrigin = (/^((http:)|(https:)|(file:))/.test(loaderSrc) && loaderSrc.substring(0, self.origin.length) !== self.origin);
			if (!isCrossOrigin) {
				// use `fetch` if possible because `importScripts`
				// is synchronous and can lead to deadlocks on Safari
				fetch(loaderSrc).then((response) => {
					if (response.status !== 200) {
						throw new Error(response.statusText);
					}
					return response.text();
				}).then((text) => {
					text = `${text}\n//# sourceURL=${loaderSrc}`;
					const func = (
						trustedTypesPolicy
							// below codes are changed by github1s
							// fix error in webworker for old browsers
							? self.eval(trustedTypesPolicy.createScript('', text).toString())
							// above codes are changed by github1s
							: new Function(text)
					);
					func.call(self);
					resolve();
				}).then(undefined, reject);
				return;
			}

			if (trustedTypesPolicy) {
				importScripts(trustedTypesPolicy.createScriptURL(loaderSrc) as unknown as string);
			} else {
				importScripts(loaderSrc as string);
			}
			resolve();
		});
	}

	const loadCode = function (moduleId: string) {
		loadAMDLoader().then(() => {
			require.config({
				baseUrl: monacoBaseUrl,
				catchError: true,
				trustedTypesPolicy,
			});
			require([moduleId], function (ws) {
				setTimeout(function () {
					let messageHandler = ws.create((msg: any, transfer?: Transferable[]) => {
						(<any>self).postMessage(msg, transfer);
					}, null);

					self.onmessage = (e: MessageEvent) => messageHandler.onmessage(e.data);
					while (beforeReadyMessages.length > 0) {
						self.onmessage(beforeReadyMessages.shift()!);
					}
				}, 0);
			});
		});
	};

	let isFirstMessage = true;
	let beforeReadyMessages: MessageEvent[] = [];
	self.onmessage = (message: MessageEvent) => {
		if (!isFirstMessage) {
			beforeReadyMessages.push(message);
			return;
		}

		isFirstMessage = false;
		loadCode(message.data);
	};
})();
