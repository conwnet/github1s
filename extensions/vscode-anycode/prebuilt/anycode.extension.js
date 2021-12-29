let __create = Object.create;
let __defProp = Object.defineProperty;
let __getOwnPropDesc = Object.getOwnPropertyDescriptor;
let __getOwnPropNames = Object.getOwnPropertyNames;
let __getProtoOf = Object.getPrototypeOf;
let __hasOwnProp = Object.prototype.hasOwnProperty;
let __markAsModule = (target) =>
	__defProp(target, '__esModule', { value: true });
let __commonJS = (cb, mod) =>
	function __require() {
		return (
			mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod),
			mod.exports
		);
	};
let __export = (target, all) => {
	__markAsModule(target);
	for (let name in all) {
		__defProp(target, name, { get: all[name], enumerable: true });
	}
};
let __reExport = (target, module2, desc) => {
	if (
		(module2 && typeof module2 === 'object') ||
		typeof module2 === 'function'
	) {
		for (let key of __getOwnPropNames(module2)) {
			if (!__hasOwnProp.call(target, key) && key !== 'default') {
				__defProp(target, key, {
					get: () => module2[key],
					enumerable:
						!(desc = __getOwnPropDesc(module2, key)) || desc.enumerable,
				});
			}
		}
	}
	return target;
};
let __toModule = (module2) => {
	return __reExport(
		__markAsModule(
			__defProp(
				module2 != null ? __create(__getProtoOf(module2)) : {},
				'default',
				module2 && module2.__esModule && 'default' in module2
					? { get: () => module2.default, enumerable: true }
					: { value: module2, enumerable: true }
			)
		),
		module2
	);
};

// client/node_modules/vscode-jsonrpc/lib/common/ral.js
let require_ral = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/ral.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let _ral;
		function RAL() {
			if (_ral === void 0) {
				throw new Error(`No runtime abstraction layer installed`);
			}
			return _ral;
		}
		(function (RAL2) {
			function install(ral) {
				if (ral === void 0) {
					throw new Error(`No runtime abstraction layer provided`);
				}
				_ral = ral;
			}
			RAL2.install = install;
		})(RAL || (RAL = {}));
		exports.default = RAL;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/disposable.js
let require_disposable = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/disposable.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.Disposable = void 0;
		let Disposable3;
		(function (Disposable4) {
			function create(func) {
				return {
					dispose: func,
				};
			}
			Disposable4.create = create;
		})((Disposable3 = exports.Disposable || (exports.Disposable = {})));
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/events.js
let require_events = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/events.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.Emitter = exports.Event = void 0;
		let ral_1 = require_ral();
		let Event2;
		(function (Event3) {
			const _disposable = { dispose() {} };
			Event3.None = function () {
				return _disposable;
			};
		})((Event2 = exports.Event || (exports.Event = {})));
		let CallbackList = class {
			add(callback, context = null, bucket) {
				if (!this._callbacks) {
					this._callbacks = [];
					this._contexts = [];
				}
				this._callbacks.push(callback);
				this._contexts.push(context);
				if (Array.isArray(bucket)) {
					bucket.push({ dispose: () => this.remove(callback, context) });
				}
			}
			remove(callback, context = null) {
				if (!this._callbacks) {
					return;
				}
				let foundCallbackWithDifferentContext = false;
				for (let i = 0, len = this._callbacks.length; i < len; i++) {
					if (this._callbacks[i] === callback) {
						if (this._contexts[i] === context) {
							this._callbacks.splice(i, 1);
							this._contexts.splice(i, 1);
							return;
						} else {
							foundCallbackWithDifferentContext = true;
						}
					}
				}
				if (foundCallbackWithDifferentContext) {
					throw new Error(
						'When adding a listener with a context, you should remove it with the same context'
					);
				}
			}
			invoke(...args) {
				if (!this._callbacks) {
					return [];
				}
				const ret = [],
					callbacks = this._callbacks.slice(0),
					contexts = this._contexts.slice(0);
				for (let i = 0, len = callbacks.length; i < len; i++) {
					try {
						ret.push(callbacks[i].apply(contexts[i], args));
					} catch (e) {
						(0, ral_1.default)().console.error(e);
					}
				}
				return ret;
			}
			isEmpty() {
				return !this._callbacks || this._callbacks.length === 0;
			}
			dispose() {
				this._callbacks = void 0;
				this._contexts = void 0;
			}
		};
		var Emitter = class {
			constructor(_options) {
				this._options = _options;
			}
			get event() {
				if (!this._event) {
					this._event = (listener, thisArgs, disposables) => {
						if (!this._callbacks) {
							this._callbacks = new CallbackList();
						}
						if (
							this._options &&
							this._options.onFirstListenerAdd &&
							this._callbacks.isEmpty()
						) {
							this._options.onFirstListenerAdd(this);
						}
						this._callbacks.add(listener, thisArgs);
						const result = {
							dispose: () => {
								if (!this._callbacks) {
									return;
								}
								this._callbacks.remove(listener, thisArgs);
								result.dispose = Emitter._noop;
								if (
									this._options &&
									this._options.onLastListenerRemove &&
									this._callbacks.isEmpty()
								) {
									this._options.onLastListenerRemove(this);
								}
							},
						};
						if (Array.isArray(disposables)) {
							disposables.push(result);
						}
						return result;
					};
				}
				return this._event;
			}
			fire(event) {
				if (this._callbacks) {
					this._callbacks.invoke.call(this._callbacks, event);
				}
			}
			dispose() {
				if (this._callbacks) {
					this._callbacks.dispose();
					this._callbacks = void 0;
				}
			}
		};
		exports.Emitter = Emitter;
		Emitter._noop = function () {};
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/messageBuffer.js
let require_messageBuffer = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/messageBuffer.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.AbstractMessageBuffer = void 0;
		let CR = 13;
		let LF = 10;
		let CRLF = '\r\n';
		let AbstractMessageBuffer = class {
			constructor(encoding = 'utf-8') {
				this._encoding = encoding;
				this._chunks = [];
				this._totalLength = 0;
			}
			get encoding() {
				return this._encoding;
			}
			append(chunk) {
				const toAppend =
					typeof chunk === 'string'
						? this.fromString(chunk, this._encoding)
						: chunk;
				this._chunks.push(toAppend);
				this._totalLength += toAppend.byteLength;
			}
			tryReadHeaders() {
				if (this._chunks.length === 0) {
					return void 0;
				}
				let state = 0;
				let chunkIndex = 0;
				let offset = 0;
				let chunkBytesRead = 0;
				row: while (chunkIndex < this._chunks.length) {
					const chunk = this._chunks[chunkIndex];
					offset = 0;
					while (offset < chunk.length) {
						const value = chunk[offset];
						switch (value) {
							case CR:
								switch (state) {
									case 0:
										state = 1;
										break;
									case 2:
										state = 3;
										break;
									default:
										state = 0;
								}
								break;
							case LF:
								switch (state) {
									case 1:
										state = 2;
										break;
									case 3:
										state = 4;
										offset++;
										break row;
									default:
										state = 0;
								}
								break;
							default:
								state = 0;
						}
						offset++;
					}
					chunkBytesRead += chunk.byteLength;
					chunkIndex++;
				}
				if (state !== 4) {
					return void 0;
				}
				const buffer = this._read(chunkBytesRead + offset);
				const result = new Map();
				const headers = this.toString(buffer, 'ascii').split(CRLF);
				if (headers.length < 2) {
					return result;
				}
				for (let i = 0; i < headers.length - 2; i++) {
					const header = headers[i];
					const index = header.indexOf(':');
					if (index === -1) {
						throw new Error(
							'Message header must separate key and value using :'
						);
					}
					const key = header.substr(0, index);
					const value = header.substr(index + 1).trim();
					result.set(key, value);
				}
				return result;
			}
			tryReadBody(length) {
				if (this._totalLength < length) {
					return void 0;
				}
				return this._read(length);
			}
			get numberOfBytes() {
				return this._totalLength;
			}
			_read(byteCount) {
				if (byteCount === 0) {
					return this.emptyBuffer();
				}
				if (byteCount > this._totalLength) {
					throw new Error(`Cannot read so many bytes!`);
				}
				if (this._chunks[0].byteLength === byteCount) {
					const chunk = this._chunks[0];
					this._chunks.shift();
					this._totalLength -= byteCount;
					return this.asNative(chunk);
				}
				if (this._chunks[0].byteLength > byteCount) {
					const chunk = this._chunks[0];
					const result2 = this.asNative(chunk, byteCount);
					this._chunks[0] = chunk.slice(byteCount);
					this._totalLength -= byteCount;
					return result2;
				}
				const result = this.allocNative(byteCount);
				let resultOffset = 0;
				let chunkIndex = 0;
				while (byteCount > 0) {
					const chunk = this._chunks[chunkIndex];
					if (chunk.byteLength > byteCount) {
						const chunkPart = chunk.slice(0, byteCount);
						result.set(chunkPart, resultOffset);
						resultOffset += byteCount;
						this._chunks[chunkIndex] = chunk.slice(byteCount);
						this._totalLength -= byteCount;
						byteCount -= byteCount;
					} else {
						result.set(chunk, resultOffset);
						resultOffset += chunk.byteLength;
						this._chunks.shift();
						this._totalLength -= chunk.byteLength;
						byteCount -= chunk.byteLength;
					}
				}
				return result;
			}
		};
		exports.AbstractMessageBuffer = AbstractMessageBuffer;
	},
});

// client/node_modules/vscode-jsonrpc/lib/browser/ril.js
let require_ril = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/browser/ril.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let ral_1 = require_ral();
		let disposable_1 = require_disposable();
		let events_1 = require_events();
		let messageBuffer_1 = require_messageBuffer();
		var MessageBuffer = class extends messageBuffer_1.AbstractMessageBuffer {
			constructor(encoding = 'utf-8') {
				super(encoding);
				this.asciiDecoder = new TextDecoder('ascii');
			}
			emptyBuffer() {
				return MessageBuffer.emptyBuffer;
			}
			fromString(value, _encoding) {
				return new TextEncoder().encode(value);
			}
			toString(value, encoding) {
				if (encoding === 'ascii') {
					return this.asciiDecoder.decode(value);
				} else {
					return new TextDecoder(encoding).decode(value);
				}
			}
			asNative(buffer, length) {
				if (length === void 0) {
					return buffer;
				} else {
					return buffer.slice(0, length);
				}
			}
			allocNative(length) {
				return new Uint8Array(length);
			}
		};
		MessageBuffer.emptyBuffer = new Uint8Array(0);
		let ReadableStreamWrapper = class {
			constructor(socket) {
				this.socket = socket;
				this._onData = new events_1.Emitter();
				this._messageListener = (event) => {
					const blob = event.data;
					blob.arrayBuffer().then(
						(buffer) => {
							this._onData.fire(new Uint8Array(buffer));
						},
						() => {
							(0, ral_1.default)().console.error(
								`Converting blob to array buffer failed.`
							);
						}
					);
				};
				this.socket.addEventListener('message', this._messageListener);
			}
			onClose(listener) {
				this.socket.addEventListener('close', listener);
				return disposable_1.Disposable.create(() =>
					this.socket.removeEventListener('close', listener)
				);
			}
			onError(listener) {
				this.socket.addEventListener('error', listener);
				return disposable_1.Disposable.create(() =>
					this.socket.removeEventListener('error', listener)
				);
			}
			onEnd(listener) {
				this.socket.addEventListener('end', listener);
				return disposable_1.Disposable.create(() =>
					this.socket.removeEventListener('end', listener)
				);
			}
			onData(listener) {
				return this._onData.event(listener);
			}
		};
		let WritableStreamWrapper = class {
			constructor(socket) {
				this.socket = socket;
			}
			onClose(listener) {
				this.socket.addEventListener('close', listener);
				return disposable_1.Disposable.create(() =>
					this.socket.removeEventListener('close', listener)
				);
			}
			onError(listener) {
				this.socket.addEventListener('error', listener);
				return disposable_1.Disposable.create(() =>
					this.socket.removeEventListener('error', listener)
				);
			}
			onEnd(listener) {
				this.socket.addEventListener('end', listener);
				return disposable_1.Disposable.create(() =>
					this.socket.removeEventListener('end', listener)
				);
			}
			write(data, encoding) {
				if (typeof data === 'string') {
					if (encoding !== void 0 && encoding !== 'utf-8') {
						throw new Error(
							`In a Browser environments only utf-8 text encoding is supported. But got encoding: ${encoding}`
						);
					}
					this.socket.send(data);
				} else {
					this.socket.send(data);
				}
				return Promise.resolve();
			}
			end() {
				this.socket.close();
			}
		};
		let _textEncoder = new TextEncoder();
		let _ril = Object.freeze({
			messageBuffer: Object.freeze({
				create: (encoding) => new MessageBuffer(encoding),
			}),
			applicationJson: Object.freeze({
				encoder: Object.freeze({
					name: 'application/json',
					encode: (msg, options) => {
						if (options.charset !== 'utf-8') {
							throw new Error(
								`In a Browser environments only utf-8 text encoding is supported. But got encoding: ${options.charset}`
							);
						}
						return Promise.resolve(
							_textEncoder.encode(JSON.stringify(msg, void 0, 0))
						);
					},
				}),
				decoder: Object.freeze({
					name: 'application/json',
					decode: (buffer, options) => {
						if (!(buffer instanceof Uint8Array)) {
							throw new Error(
								`In a Browser environments only Uint8Arrays are supported.`
							);
						}
						return Promise.resolve(
							JSON.parse(new TextDecoder(options.charset).decode(buffer))
						);
					},
				}),
			}),
			stream: Object.freeze({
				asReadableStream: (socket) => new ReadableStreamWrapper(socket),
				asWritableStream: (socket) => new WritableStreamWrapper(socket),
			}),
			console,
			timer: Object.freeze({
				setTimeout(callback, ms2, ...args) {
					const handle = setTimeout(callback, ms2, ...args);
					return { dispose: () => clearTimeout(handle) };
				},
				setImmediate(callback, ...args) {
					const handle = setTimeout(callback, 0, ...args);
					return { dispose: () => clearTimeout(handle) };
				},
				setInterval(callback, ms2, ...args) {
					const handle = setInterval(callback, ms2, ...args);
					return { dispose: () => clearInterval(handle) };
				},
			}),
		});
		function RIL() {
			return _ril;
		}
		(function (RIL2) {
			function install() {
				ral_1.default.install(_ril);
			}
			RIL2.install = install;
		})(RIL || (RIL = {}));
		exports.default = RIL;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/is.js
let require_is = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/is.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.stringArray = exports.array = exports.func = exports.error = exports.number = exports.string = exports.boolean = void 0;
		function boolean(value) {
			return value === true || value === false;
		}
		exports.boolean = boolean;
		function string(value) {
			return typeof value === 'string' || value instanceof String;
		}
		exports.string = string;
		function number(value) {
			return typeof value === 'number' || value instanceof Number;
		}
		exports.number = number;
		function error(value) {
			return value instanceof Error;
		}
		exports.error = error;
		function func(value) {
			return typeof value === 'function';
		}
		exports.func = func;
		function array(value) {
			return Array.isArray(value);
		}
		exports.array = array;
		function stringArray(value) {
			return array(value) && value.every((elem) => string(elem));
		}
		exports.stringArray = stringArray;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/messages.js
let require_messages = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/messages.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.Message = exports.NotificationType9 = exports.NotificationType8 = exports.NotificationType7 = exports.NotificationType6 = exports.NotificationType5 = exports.NotificationType4 = exports.NotificationType3 = exports.NotificationType2 = exports.NotificationType1 = exports.NotificationType0 = exports.NotificationType = exports.RequestType9 = exports.RequestType8 = exports.RequestType7 = exports.RequestType6 = exports.RequestType5 = exports.RequestType4 = exports.RequestType3 = exports.RequestType2 = exports.RequestType1 = exports.RequestType = exports.RequestType0 = exports.AbstractMessageSignature = exports.ParameterStructures = exports.ResponseError = exports.ErrorCodes = void 0;
		let is2 = require_is();
		let ErrorCodes;
		(function (ErrorCodes2) {
			ErrorCodes2.ParseError = -32700;
			ErrorCodes2.InvalidRequest = -32600;
			ErrorCodes2.MethodNotFound = -32601;
			ErrorCodes2.InvalidParams = -32602;
			ErrorCodes2.InternalError = -32603;
			ErrorCodes2.jsonrpcReservedErrorRangeStart = -32099;
			ErrorCodes2.serverErrorStart = ErrorCodes2.jsonrpcReservedErrorRangeStart;
			ErrorCodes2.MessageWriteError = -32099;
			ErrorCodes2.MessageReadError = -32098;
			ErrorCodes2.ServerNotInitialized = -32002;
			ErrorCodes2.UnknownErrorCode = -32001;
			ErrorCodes2.jsonrpcReservedErrorRangeEnd = -32e3;
			ErrorCodes2.serverErrorEnd = ErrorCodes2.jsonrpcReservedErrorRangeEnd;
		})((ErrorCodes = exports.ErrorCodes || (exports.ErrorCodes = {})));
		var ResponseError = class extends Error {
			constructor(code, message, data) {
				super(message);
				this.code = is2.number(code) ? code : ErrorCodes.UnknownErrorCode;
				this.data = data;
				Object.setPrototypeOf(this, ResponseError.prototype);
			}
			toJson() {
				const result = {
					code: this.code,
					message: this.message,
				};
				if (this.data !== void 0) {
					result.data = this.data;
				}
				return result;
			}
		};
		exports.ResponseError = ResponseError;
		var ParameterStructures = class {
			constructor(kind) {
				this.kind = kind;
			}
			static is(value) {
				return (
					value === ParameterStructures.auto ||
					value === ParameterStructures.byName ||
					value === ParameterStructures.byPosition
				);
			}
			toString() {
				return this.kind;
			}
		};
		exports.ParameterStructures = ParameterStructures;
		ParameterStructures.auto = new ParameterStructures('auto');
		ParameterStructures.byPosition = new ParameterStructures('byPosition');
		ParameterStructures.byName = new ParameterStructures('byName');
		let AbstractMessageSignature = class {
			constructor(method, numberOfParams) {
				this.method = method;
				this.numberOfParams = numberOfParams;
			}
			get parameterStructures() {
				return ParameterStructures.auto;
			}
		};
		exports.AbstractMessageSignature = AbstractMessageSignature;
		let RequestType0 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 0);
			}
		};
		exports.RequestType0 = RequestType0;
		let RequestType = class extends AbstractMessageSignature {
			constructor(method, _parameterStructures = ParameterStructures.auto) {
				super(method, 1);
				this._parameterStructures = _parameterStructures;
			}
			get parameterStructures() {
				return this._parameterStructures;
			}
		};
		exports.RequestType = RequestType;
		let RequestType1 = class extends AbstractMessageSignature {
			constructor(method, _parameterStructures = ParameterStructures.auto) {
				super(method, 1);
				this._parameterStructures = _parameterStructures;
			}
			get parameterStructures() {
				return this._parameterStructures;
			}
		};
		exports.RequestType1 = RequestType1;
		let RequestType2 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 2);
			}
		};
		exports.RequestType2 = RequestType2;
		let RequestType3 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 3);
			}
		};
		exports.RequestType3 = RequestType3;
		let RequestType4 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 4);
			}
		};
		exports.RequestType4 = RequestType4;
		let RequestType5 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 5);
			}
		};
		exports.RequestType5 = RequestType5;
		let RequestType6 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 6);
			}
		};
		exports.RequestType6 = RequestType6;
		let RequestType7 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 7);
			}
		};
		exports.RequestType7 = RequestType7;
		let RequestType8 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 8);
			}
		};
		exports.RequestType8 = RequestType8;
		let RequestType9 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 9);
			}
		};
		exports.RequestType9 = RequestType9;
		let NotificationType = class extends AbstractMessageSignature {
			constructor(method, _parameterStructures = ParameterStructures.auto) {
				super(method, 1);
				this._parameterStructures = _parameterStructures;
			}
			get parameterStructures() {
				return this._parameterStructures;
			}
		};
		exports.NotificationType = NotificationType;
		let NotificationType0 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 0);
			}
		};
		exports.NotificationType0 = NotificationType0;
		let NotificationType1 = class extends AbstractMessageSignature {
			constructor(method, _parameterStructures = ParameterStructures.auto) {
				super(method, 1);
				this._parameterStructures = _parameterStructures;
			}
			get parameterStructures() {
				return this._parameterStructures;
			}
		};
		exports.NotificationType1 = NotificationType1;
		let NotificationType2 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 2);
			}
		};
		exports.NotificationType2 = NotificationType2;
		let NotificationType3 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 3);
			}
		};
		exports.NotificationType3 = NotificationType3;
		let NotificationType4 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 4);
			}
		};
		exports.NotificationType4 = NotificationType4;
		let NotificationType5 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 5);
			}
		};
		exports.NotificationType5 = NotificationType5;
		let NotificationType6 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 6);
			}
		};
		exports.NotificationType6 = NotificationType6;
		let NotificationType7 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 7);
			}
		};
		exports.NotificationType7 = NotificationType7;
		let NotificationType8 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 8);
			}
		};
		exports.NotificationType8 = NotificationType8;
		let NotificationType9 = class extends AbstractMessageSignature {
			constructor(method) {
				super(method, 9);
			}
		};
		exports.NotificationType9 = NotificationType9;
		let Message;
		(function (Message2) {
			function isRequest(message) {
				const candidate = message;
				return (
					candidate &&
					is2.string(candidate.method) &&
					(is2.string(candidate.id) || is2.number(candidate.id))
				);
			}
			Message2.isRequest = isRequest;
			function isNotification(message) {
				const candidate = message;
				return (
					candidate && is2.string(candidate.method) && message.id === void 0
				);
			}
			Message2.isNotification = isNotification;
			function isResponse(message) {
				const candidate = message;
				return (
					candidate &&
					(candidate.result !== void 0 || !!candidate.error) &&
					(is2.string(candidate.id) ||
						is2.number(candidate.id) ||
						candidate.id === null)
				);
			}
			Message2.isResponse = isResponse;
		})((Message = exports.Message || (exports.Message = {})));
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/linkedMap.js
let require_linkedMap = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/linkedMap.js'(exports) {
		'use strict';
		let _a2;
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.LRUCache = exports.LinkedMap = exports.Touch = void 0;
		let Touch;
		(function (Touch2) {
			Touch2.None = 0;
			Touch2.First = 1;
			Touch2.AsOld = Touch2.First;
			Touch2.Last = 2;
			Touch2.AsNew = Touch2.Last;
		})((Touch = exports.Touch || (exports.Touch = {})));
		let LinkedMap = class {
			constructor() {
				this[_a2] = 'LinkedMap';
				this._map = new Map();
				this._head = void 0;
				this._tail = void 0;
				this._size = 0;
				this._state = 0;
			}
			clear() {
				this._map.clear();
				this._head = void 0;
				this._tail = void 0;
				this._size = 0;
				this._state++;
			}
			isEmpty() {
				return !this._head && !this._tail;
			}
			get size() {
				return this._size;
			}
			get first() {
				return this._head?.value;
			}
			get last() {
				return this._tail?.value;
			}
			has(key) {
				return this._map.has(key);
			}
			get(key, touch = Touch.None) {
				const item = this._map.get(key);
				if (!item) {
					return void 0;
				}
				if (touch !== Touch.None) {
					this.touch(item, touch);
				}
				return item.value;
			}
			set(key, value, touch = Touch.None) {
				let item = this._map.get(key);
				if (item) {
					item.value = value;
					if (touch !== Touch.None) {
						this.touch(item, touch);
					}
				} else {
					item = { key, value, next: void 0, previous: void 0 };
					switch (touch) {
						case Touch.None:
							this.addItemLast(item);
							break;
						case Touch.First:
							this.addItemFirst(item);
							break;
						case Touch.Last:
							this.addItemLast(item);
							break;
						default:
							this.addItemLast(item);
							break;
					}
					this._map.set(key, item);
					this._size++;
				}
				return this;
			}
			delete(key) {
				return !!this.remove(key);
			}
			remove(key) {
				const item = this._map.get(key);
				if (!item) {
					return void 0;
				}
				this._map.delete(key);
				this.removeItem(item);
				this._size--;
				return item.value;
			}
			shift() {
				if (!this._head && !this._tail) {
					return void 0;
				}
				if (!this._head || !this._tail) {
					throw new Error('Invalid list');
				}
				const item = this._head;
				this._map.delete(item.key);
				this.removeItem(item);
				this._size--;
				return item.value;
			}
			forEach(callbackfn, thisArg) {
				const state = this._state;
				let current = this._head;
				while (current) {
					if (thisArg) {
						callbackfn.bind(thisArg)(current.value, current.key, this);
					} else {
						callbackfn(current.value, current.key, this);
					}
					if (this._state !== state) {
						throw new Error(`LinkedMap got modified during iteration.`);
					}
					current = current.next;
				}
			}
			keys() {
				const state = this._state;
				let current = this._head;
				const iterator = {
					[Symbol.iterator]: () => {
						return iterator;
					},
					next: () => {
						if (this._state !== state) {
							throw new Error(`LinkedMap got modified during iteration.`);
						}
						if (current) {
							const result = { value: current.key, done: false };
							current = current.next;
							return result;
						} else {
							return { value: void 0, done: true };
						}
					},
				};
				return iterator;
			}
			values() {
				const state = this._state;
				let current = this._head;
				const iterator = {
					[Symbol.iterator]: () => {
						return iterator;
					},
					next: () => {
						if (this._state !== state) {
							throw new Error(`LinkedMap got modified during iteration.`);
						}
						if (current) {
							const result = { value: current.value, done: false };
							current = current.next;
							return result;
						} else {
							return { value: void 0, done: true };
						}
					},
				};
				return iterator;
			}
			entries() {
				const state = this._state;
				let current = this._head;
				const iterator = {
					[Symbol.iterator]: () => {
						return iterator;
					},
					next: () => {
						if (this._state !== state) {
							throw new Error(`LinkedMap got modified during iteration.`);
						}
						if (current) {
							const result = {
								value: [current.key, current.value],
								done: false,
							};
							current = current.next;
							return result;
						} else {
							return { value: void 0, done: true };
						}
					},
				};
				return iterator;
			}
			[((_a2 = Symbol.toStringTag), Symbol.iterator)]() {
				return this.entries();
			}
			trimOld(newSize) {
				if (newSize >= this.size) {
					return;
				}
				if (newSize === 0) {
					this.clear();
					return;
				}
				let current = this._head;
				let currentSize = this.size;
				while (current && currentSize > newSize) {
					this._map.delete(current.key);
					current = current.next;
					currentSize--;
				}
				this._head = current;
				this._size = currentSize;
				if (current) {
					current.previous = void 0;
				}
				this._state++;
			}
			addItemFirst(item) {
				if (!this._head && !this._tail) {
					this._tail = item;
				} else if (!this._head) {
					throw new Error('Invalid list');
				} else {
					item.next = this._head;
					this._head.previous = item;
				}
				this._head = item;
				this._state++;
			}
			addItemLast(item) {
				if (!this._head && !this._tail) {
					this._head = item;
				} else if (!this._tail) {
					throw new Error('Invalid list');
				} else {
					item.previous = this._tail;
					this._tail.next = item;
				}
				this._tail = item;
				this._state++;
			}
			removeItem(item) {
				if (item === this._head && item === this._tail) {
					this._head = void 0;
					this._tail = void 0;
				} else if (item === this._head) {
					if (!item.next) {
						throw new Error('Invalid list');
					}
					item.next.previous = void 0;
					this._head = item.next;
				} else if (item === this._tail) {
					if (!item.previous) {
						throw new Error('Invalid list');
					}
					item.previous.next = void 0;
					this._tail = item.previous;
				} else {
					const next = item.next;
					const previous = item.previous;
					if (!next || !previous) {
						throw new Error('Invalid list');
					}
					next.previous = previous;
					previous.next = next;
				}
				item.next = void 0;
				item.previous = void 0;
				this._state++;
			}
			touch(item, touch) {
				if (!this._head || !this._tail) {
					throw new Error('Invalid list');
				}
				if (touch !== Touch.First && touch !== Touch.Last) {
					return;
				}
				if (touch === Touch.First) {
					if (item === this._head) {
						return;
					}
					const next = item.next;
					const previous = item.previous;
					if (item === this._tail) {
						previous.next = void 0;
						this._tail = previous;
					} else {
						next.previous = previous;
						previous.next = next;
					}
					item.previous = void 0;
					item.next = this._head;
					this._head.previous = item;
					this._head = item;
					this._state++;
				} else if (touch === Touch.Last) {
					if (item === this._tail) {
						return;
					}
					const next = item.next;
					const previous = item.previous;
					if (item === this._head) {
						next.previous = void 0;
						this._head = next;
					} else {
						next.previous = previous;
						previous.next = next;
					}
					item.next = void 0;
					item.previous = this._tail;
					this._tail.next = item;
					this._tail = item;
					this._state++;
				}
			}
			toJSON() {
				const data = [];
				this.forEach((value, key) => {
					data.push([key, value]);
				});
				return data;
			}
			fromJSON(data) {
				this.clear();
				for (const [key, value] of data) {
					this.set(key, value);
				}
			}
		};
		exports.LinkedMap = LinkedMap;
		let LRUCache = class extends LinkedMap {
			constructor(limit, ratio = 1) {
				super();
				this._limit = limit;
				this._ratio = Math.min(Math.max(0, ratio), 1);
			}
			get limit() {
				return this._limit;
			}
			set limit(limit) {
				this._limit = limit;
				this.checkTrim();
			}
			get ratio() {
				return this._ratio;
			}
			set ratio(ratio) {
				this._ratio = Math.min(Math.max(0, ratio), 1);
				this.checkTrim();
			}
			get(key, touch = Touch.AsNew) {
				return super.get(key, touch);
			}
			peek(key) {
				return super.get(key, Touch.None);
			}
			set(key, value) {
				super.set(key, value, Touch.Last);
				this.checkTrim();
				return this;
			}
			checkTrim() {
				if (this.size > this._limit) {
					this.trimOld(Math.round(this._limit * this._ratio));
				}
			}
		};
		exports.LRUCache = LRUCache;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/cancellation.js
let require_cancellation = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/cancellation.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.CancellationTokenSource = exports.CancellationToken = void 0;
		let ral_1 = require_ral();
		let Is2 = require_is();
		let events_1 = require_events();
		let CancellationToken;
		(function (CancellationToken2) {
			CancellationToken2.None = Object.freeze({
				isCancellationRequested: false,
				onCancellationRequested: events_1.Event.None,
			});
			CancellationToken2.Cancelled = Object.freeze({
				isCancellationRequested: true,
				onCancellationRequested: events_1.Event.None,
			});
			function is2(value) {
				const candidate = value;
				return (
					candidate &&
					(candidate === CancellationToken2.None ||
						candidate === CancellationToken2.Cancelled ||
						(Is2.boolean(candidate.isCancellationRequested) &&
							!!candidate.onCancellationRequested))
				);
			}
			CancellationToken2.is = is2;
		})(
			(CancellationToken =
				exports.CancellationToken || (exports.CancellationToken = {}))
		);
		let shortcutEvent = Object.freeze(function (callback, context) {
			const handle = (0, ral_1.default)().timer.setTimeout(
				callback.bind(context),
				0
			);
			return {
				dispose() {
					handle.dispose();
				},
			};
		});
		let MutableToken = class {
			constructor() {
				this._isCancelled = false;
			}
			cancel() {
				if (!this._isCancelled) {
					this._isCancelled = true;
					if (this._emitter) {
						this._emitter.fire(void 0);
						this.dispose();
					}
				}
			}
			get isCancellationRequested() {
				return this._isCancelled;
			}
			get onCancellationRequested() {
				if (this._isCancelled) {
					return shortcutEvent;
				}
				if (!this._emitter) {
					this._emitter = new events_1.Emitter();
				}
				return this._emitter.event;
			}
			dispose() {
				if (this._emitter) {
					this._emitter.dispose();
					this._emitter = void 0;
				}
			}
		};
		let CancellationTokenSource = class {
			get token() {
				if (!this._token) {
					this._token = new MutableToken();
				}
				return this._token;
			}
			cancel() {
				if (!this._token) {
					this._token = CancellationToken.Cancelled;
				} else {
					this._token.cancel();
				}
			}
			dispose() {
				if (!this._token) {
					this._token = CancellationToken.None;
				} else if (this._token instanceof MutableToken) {
					this._token.dispose();
				}
			}
		};
		exports.CancellationTokenSource = CancellationTokenSource;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/messageReader.js
let require_messageReader = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/messageReader.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ReadableStreamMessageReader = exports.AbstractMessageReader = exports.MessageReader = void 0;
		let ral_1 = require_ral();
		let Is2 = require_is();
		let events_1 = require_events();
		let MessageReader;
		(function (MessageReader2) {
			function is2(value) {
				let candidate = value;
				return (
					candidate &&
					Is2.func(candidate.listen) &&
					Is2.func(candidate.dispose) &&
					Is2.func(candidate.onError) &&
					Is2.func(candidate.onClose) &&
					Is2.func(candidate.onPartialMessage)
				);
			}
			MessageReader2.is = is2;
		})((MessageReader = exports.MessageReader || (exports.MessageReader = {})));
		let AbstractMessageReader = class {
			constructor() {
				this.errorEmitter = new events_1.Emitter();
				this.closeEmitter = new events_1.Emitter();
				this.partialMessageEmitter = new events_1.Emitter();
			}
			dispose() {
				this.errorEmitter.dispose();
				this.closeEmitter.dispose();
			}
			get onError() {
				return this.errorEmitter.event;
			}
			fireError(error) {
				this.errorEmitter.fire(this.asError(error));
			}
			get onClose() {
				return this.closeEmitter.event;
			}
			fireClose() {
				this.closeEmitter.fire(void 0);
			}
			get onPartialMessage() {
				return this.partialMessageEmitter.event;
			}
			firePartialMessage(info) {
				this.partialMessageEmitter.fire(info);
			}
			asError(error) {
				if (error instanceof Error) {
					return error;
				} else {
					return new Error(
						`Reader received error. Reason: ${
							Is2.string(error.message) ? error.message : 'unknown'
						}`
					);
				}
			}
		};
		exports.AbstractMessageReader = AbstractMessageReader;
		let ResolvedMessageReaderOptions;
		(function (ResolvedMessageReaderOptions2) {
			function fromOptions(options) {
				let charset;
				let result;
				let contentDecoder;
				const contentDecoders = new Map();
				let contentTypeDecoder;
				const contentTypeDecoders = new Map();
				if (options === void 0 || typeof options === 'string') {
					charset = options ?? 'utf-8';
				} else {
					charset = options.charset ?? 'utf-8';
					if (options.contentDecoder !== void 0) {
						contentDecoder = options.contentDecoder;
						contentDecoders.set(contentDecoder.name, contentDecoder);
					}
					if (options.contentDecoders !== void 0) {
						for (const decoder of options.contentDecoders) {
							contentDecoders.set(decoder.name, decoder);
						}
					}
					if (options.contentTypeDecoder !== void 0) {
						contentTypeDecoder = options.contentTypeDecoder;
						contentTypeDecoders.set(
							contentTypeDecoder.name,
							contentTypeDecoder
						);
					}
					if (options.contentTypeDecoders !== void 0) {
						for (const decoder of options.contentTypeDecoders) {
							contentTypeDecoders.set(decoder.name, decoder);
						}
					}
				}
				if (contentTypeDecoder === void 0) {
					contentTypeDecoder = (0, ral_1.default)().applicationJson.decoder;
					contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
				}
				return {
					charset,
					contentDecoder,
					contentDecoders,
					contentTypeDecoder,
					contentTypeDecoders,
				};
			}
			ResolvedMessageReaderOptions2.fromOptions = fromOptions;
		})(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));
		let ReadableStreamMessageReader = class extends AbstractMessageReader {
			constructor(readable, options) {
				super();
				this.readable = readable;
				this.options = ResolvedMessageReaderOptions.fromOptions(options);
				this.buffer = (0, ral_1.default)().messageBuffer.create(
					this.options.charset
				);
				this._partialMessageTimeout = 1e4;
				this.nextMessageLength = -1;
				this.messageToken = 0;
			}
			set partialMessageTimeout(timeout) {
				this._partialMessageTimeout = timeout;
			}
			get partialMessageTimeout() {
				return this._partialMessageTimeout;
			}
			listen(callback) {
				this.nextMessageLength = -1;
				this.messageToken = 0;
				this.partialMessageTimer = void 0;
				this.callback = callback;
				const result = this.readable.onData((data) => {
					this.onData(data);
				});
				this.readable.onError((error) => this.fireError(error));
				this.readable.onClose(() => this.fireClose());
				return result;
			}
			onData(data) {
				this.buffer.append(data);
				while (true) {
					if (this.nextMessageLength === -1) {
						const headers = this.buffer.tryReadHeaders();
						if (!headers) {
							return;
						}
						const contentLength = headers.get('Content-Length');
						if (!contentLength) {
							throw new Error('Header must provide a Content-Length property.');
						}
						const length = parseInt(contentLength);
						if (isNaN(length)) {
							throw new Error('Content-Length value must be a number.');
						}
						this.nextMessageLength = length;
					}
					const body = this.buffer.tryReadBody(this.nextMessageLength);
					if (body === void 0) {
						this.setPartialMessageTimer();
						return;
					}
					this.clearPartialMessageTimer();
					this.nextMessageLength = -1;
					let p;
					if (this.options.contentDecoder !== void 0) {
						p = this.options.contentDecoder.decode(body);
					} else {
						p = Promise.resolve(body);
					}
					p.then(
						(value) => {
							this.options.contentTypeDecoder.decode(value, this.options).then(
								(msg) => {
									this.callback(msg);
								},
								(error) => {
									this.fireError(error);
								}
							);
						},
						(error) => {
							this.fireError(error);
						}
					);
				}
			}
			clearPartialMessageTimer() {
				if (this.partialMessageTimer) {
					this.partialMessageTimer.dispose();
					this.partialMessageTimer = void 0;
				}
			}
			setPartialMessageTimer() {
				this.clearPartialMessageTimer();
				if (this._partialMessageTimeout <= 0) {
					return;
				}
				this.partialMessageTimer = (0, ral_1.default)().timer.setTimeout(
					(token, timeout) => {
						this.partialMessageTimer = void 0;
						if (token === this.messageToken) {
							this.firePartialMessage({
								messageToken: token,
								waitingTime: timeout,
							});
							this.setPartialMessageTimer();
						}
					},
					this._partialMessageTimeout,
					this.messageToken,
					this._partialMessageTimeout
				);
			}
		};
		exports.ReadableStreamMessageReader = ReadableStreamMessageReader;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/semaphore.js
let require_semaphore = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/semaphore.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.Semaphore = void 0;
		let ral_1 = require_ral();
		let Semaphore = class {
			constructor(capacity = 1) {
				if (capacity <= 0) {
					throw new Error('Capacity must be greater than 0');
				}
				this._capacity = capacity;
				this._active = 0;
				this._waiting = [];
			}
			lock(thunk) {
				return new Promise((resolve, reject) => {
					this._waiting.push({ thunk, resolve, reject });
					this.runNext();
				});
			}
			get active() {
				return this._active;
			}
			runNext() {
				if (this._waiting.length === 0 || this._active === this._capacity) {
					return;
				}
				(0, ral_1.default)().timer.setImmediate(() => this.doRunNext());
			}
			doRunNext() {
				if (this._waiting.length === 0 || this._active === this._capacity) {
					return;
				}
				const next = this._waiting.shift();
				this._active++;
				if (this._active > this._capacity) {
					throw new Error(`To many thunks active`);
				}
				try {
					const result = next.thunk();
					if (result instanceof Promise) {
						result.then(
							(value) => {
								this._active--;
								next.resolve(value);
								this.runNext();
							},
							(err) => {
								this._active--;
								next.reject(err);
								this.runNext();
							}
						);
					} else {
						this._active--;
						next.resolve(result);
						this.runNext();
					}
				} catch (err) {
					this._active--;
					next.reject(err);
					this.runNext();
				}
			}
		};
		exports.Semaphore = Semaphore;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/messageWriter.js
let require_messageWriter = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/messageWriter.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.WriteableStreamMessageWriter = exports.AbstractMessageWriter = exports.MessageWriter = void 0;
		let ral_1 = require_ral();
		let Is2 = require_is();
		let semaphore_1 = require_semaphore();
		let events_1 = require_events();
		let ContentLength = 'Content-Length: ';
		let CRLF = '\r\n';
		let MessageWriter;
		(function (MessageWriter2) {
			function is2(value) {
				let candidate = value;
				return (
					candidate &&
					Is2.func(candidate.dispose) &&
					Is2.func(candidate.onClose) &&
					Is2.func(candidate.onError) &&
					Is2.func(candidate.write)
				);
			}
			MessageWriter2.is = is2;
		})((MessageWriter = exports.MessageWriter || (exports.MessageWriter = {})));
		let AbstractMessageWriter = class {
			constructor() {
				this.errorEmitter = new events_1.Emitter();
				this.closeEmitter = new events_1.Emitter();
			}
			dispose() {
				this.errorEmitter.dispose();
				this.closeEmitter.dispose();
			}
			get onError() {
				return this.errorEmitter.event;
			}
			fireError(error, message, count) {
				this.errorEmitter.fire([this.asError(error), message, count]);
			}
			get onClose() {
				return this.closeEmitter.event;
			}
			fireClose() {
				this.closeEmitter.fire(void 0);
			}
			asError(error) {
				if (error instanceof Error) {
					return error;
				} else {
					return new Error(
						`Writer received error. Reason: ${
							Is2.string(error.message) ? error.message : 'unknown'
						}`
					);
				}
			}
		};
		exports.AbstractMessageWriter = AbstractMessageWriter;
		let ResolvedMessageWriterOptions;
		(function (ResolvedMessageWriterOptions2) {
			function fromOptions(options) {
				if (options === void 0 || typeof options === 'string') {
					return {
						charset: options ?? 'utf-8',
						contentTypeEncoder: (0, ral_1.default)().applicationJson.encoder,
					};
				} else {
					return {
						charset: options.charset ?? 'utf-8',
						contentEncoder: options.contentEncoder,
						contentTypeEncoder:
							options.contentTypeEncoder ??
							(0, ral_1.default)().applicationJson.encoder,
					};
				}
			}
			ResolvedMessageWriterOptions2.fromOptions = fromOptions;
		})(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));
		let WriteableStreamMessageWriter = class extends AbstractMessageWriter {
			constructor(writable, options) {
				super();
				this.writable = writable;
				this.options = ResolvedMessageWriterOptions.fromOptions(options);
				this.errorCount = 0;
				this.writeSemaphore = new semaphore_1.Semaphore(1);
				this.writable.onError((error) => this.fireError(error));
				this.writable.onClose(() => this.fireClose());
			}
			async write(msg) {
				return this.writeSemaphore.lock(async () => {
					const payload = this.options.contentTypeEncoder
						.encode(msg, this.options)
						.then((buffer) => {
							if (this.options.contentEncoder !== void 0) {
								return this.options.contentEncoder.encode(buffer);
							} else {
								return buffer;
							}
						});
					return payload.then(
						(buffer) => {
							const headers = [];
							headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
							headers.push(CRLF);
							return this.doWrite(msg, headers, buffer);
						},
						(error) => {
							this.fireError(error);
							throw error;
						}
					);
				});
			}
			async doWrite(msg, headers, data) {
				try {
					await this.writable.write(headers.join(''), 'ascii');
					return this.writable.write(data);
				} catch (error) {
					this.handleError(error, msg);
					return Promise.reject(error);
				}
			}
			handleError(error, msg) {
				this.errorCount++;
				this.fireError(error, msg, this.errorCount);
			}
			end() {
				this.writable.end();
			}
		};
		exports.WriteableStreamMessageWriter = WriteableStreamMessageWriter;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/connection.js
let require_connection = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/connection.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.createMessageConnection = exports.ConnectionOptions = exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.CancellationReceiverStrategy = exports.ConnectionStrategy = exports.ConnectionError = exports.ConnectionErrors = exports.LogTraceNotification = exports.SetTraceNotification = exports.TraceFormat = exports.Trace = exports.NullLogger = exports.ProgressType = exports.ProgressToken = void 0;
		let ral_1 = require_ral();
		let Is2 = require_is();
		let messages_1 = require_messages();
		let linkedMap_1 = require_linkedMap();
		let events_1 = require_events();
		let cancellation_1 = require_cancellation();
		let CancelNotification;
		(function (CancelNotification2) {
			CancelNotification2.type = new messages_1.NotificationType(
				'$/cancelRequest'
			);
		})(CancelNotification || (CancelNotification = {}));
		let ProgressToken;
		(function (ProgressToken2) {
			function is2(value) {
				return typeof value === 'string' || typeof value === 'number';
			}
			ProgressToken2.is = is2;
		})((ProgressToken = exports.ProgressToken || (exports.ProgressToken = {})));
		let ProgressNotification;
		(function (ProgressNotification2) {
			ProgressNotification2.type = new messages_1.NotificationType(
				'$/progress'
			);
		})(ProgressNotification || (ProgressNotification = {}));
		let ProgressType = class {
			constructor() {}
		};
		exports.ProgressType = ProgressType;
		let StarRequestHandler;
		(function (StarRequestHandler2) {
			function is2(value) {
				return Is2.func(value);
			}
			StarRequestHandler2.is = is2;
		})(StarRequestHandler || (StarRequestHandler = {}));
		exports.NullLogger = Object.freeze({
			error: () => {},
			warn: () => {},
			info: () => {},
			log: () => {},
		});
		let Trace;
		(function (Trace2) {
			Trace2[(Trace2['Off'] = 0)] = 'Off';
			Trace2[(Trace2['Messages'] = 1)] = 'Messages';
			Trace2[(Trace2['Compact'] = 2)] = 'Compact';
			Trace2[(Trace2['Verbose'] = 3)] = 'Verbose';
		})((Trace = exports.Trace || (exports.Trace = {})));
		(function (Trace2) {
			function fromString(value) {
				if (!Is2.string(value)) {
					return Trace2.Off;
				}
				value = value.toLowerCase();
				switch (value) {
					case 'off':
						return Trace2.Off;
					case 'messages':
						return Trace2.Messages;
					case 'compact':
						return Trace2.Compact;
					case 'verbose':
						return Trace2.Verbose;
					default:
						return Trace2.Off;
				}
			}
			Trace2.fromString = fromString;
			function toString(value) {
				switch (value) {
					case Trace2.Off:
						return 'off';
					case Trace2.Messages:
						return 'messages';
					case Trace2.Compact:
						return 'compact';
					case Trace2.Verbose:
						return 'verbose';
					default:
						return 'off';
				}
			}
			Trace2.toString = toString;
		})((Trace = exports.Trace || (exports.Trace = {})));
		let TraceFormat;
		(function (TraceFormat2) {
			TraceFormat2['Text'] = 'text';
			TraceFormat2['JSON'] = 'json';
		})((TraceFormat = exports.TraceFormat || (exports.TraceFormat = {})));
		(function (TraceFormat2) {
			function fromString(value) {
				if (!Is2.string(value)) {
					return TraceFormat2.Text;
				}
				value = value.toLowerCase();
				if (value === 'json') {
					return TraceFormat2.JSON;
				} else {
					return TraceFormat2.Text;
				}
			}
			TraceFormat2.fromString = fromString;
		})((TraceFormat = exports.TraceFormat || (exports.TraceFormat = {})));
		let SetTraceNotification;
		(function (SetTraceNotification2) {
			SetTraceNotification2.type = new messages_1.NotificationType(
				'$/setTrace'
			);
		})(
			(SetTraceNotification =
				exports.SetTraceNotification || (exports.SetTraceNotification = {}))
		);
		let LogTraceNotification;
		(function (LogTraceNotification2) {
			LogTraceNotification2.type = new messages_1.NotificationType(
				'$/logTrace'
			);
		})(
			(LogTraceNotification =
				exports.LogTraceNotification || (exports.LogTraceNotification = {}))
		);
		let ConnectionErrors;
		(function (ConnectionErrors2) {
			ConnectionErrors2[(ConnectionErrors2['Closed'] = 1)] = 'Closed';
			ConnectionErrors2[(ConnectionErrors2['Disposed'] = 2)] = 'Disposed';
			ConnectionErrors2[(ConnectionErrors2['AlreadyListening'] = 3)] =
				'AlreadyListening';
		})(
			(ConnectionErrors =
				exports.ConnectionErrors || (exports.ConnectionErrors = {}))
		);
		var ConnectionError = class extends Error {
			constructor(code, message) {
				super(message);
				this.code = code;
				Object.setPrototypeOf(this, ConnectionError.prototype);
			}
		};
		exports.ConnectionError = ConnectionError;
		let ConnectionStrategy;
		(function (ConnectionStrategy2) {
			function is2(value) {
				const candidate = value;
				return candidate && Is2.func(candidate.cancelUndispatched);
			}
			ConnectionStrategy2.is = is2;
		})(
			(ConnectionStrategy =
				exports.ConnectionStrategy || (exports.ConnectionStrategy = {}))
		);
		let CancellationReceiverStrategy;
		(function (CancellationReceiverStrategy2) {
			CancellationReceiverStrategy2.Message = Object.freeze({
				createCancellationTokenSource(_2) {
					return new cancellation_1.CancellationTokenSource();
				},
			});
			function is2(value) {
				const candidate = value;
				return candidate && Is2.func(candidate.createCancellationTokenSource);
			}
			CancellationReceiverStrategy2.is = is2;
		})(
			(CancellationReceiverStrategy =
				exports.CancellationReceiverStrategy ||
				(exports.CancellationReceiverStrategy = {}))
		);
		let CancellationSenderStrategy;
		(function (CancellationSenderStrategy2) {
			CancellationSenderStrategy2.Message = Object.freeze({
				sendCancellation(conn, id) {
					return conn.sendNotification(CancelNotification.type, { id });
				},
				cleanup(_2) {},
			});
			function is2(value) {
				const candidate = value;
				return (
					candidate &&
					Is2.func(candidate.sendCancellation) &&
					Is2.func(candidate.cleanup)
				);
			}
			CancellationSenderStrategy2.is = is2;
		})(
			(CancellationSenderStrategy =
				exports.CancellationSenderStrategy ||
				(exports.CancellationSenderStrategy = {}))
		);
		let CancellationStrategy;
		(function (CancellationStrategy2) {
			CancellationStrategy2.Message = Object.freeze({
				receiver: CancellationReceiverStrategy.Message,
				sender: CancellationSenderStrategy.Message,
			});
			function is2(value) {
				const candidate = value;
				return (
					candidate &&
					CancellationReceiverStrategy.is(candidate.receiver) &&
					CancellationSenderStrategy.is(candidate.sender)
				);
			}
			CancellationStrategy2.is = is2;
		})(
			(CancellationStrategy =
				exports.CancellationStrategy || (exports.CancellationStrategy = {}))
		);
		let ConnectionOptions;
		(function (ConnectionOptions2) {
			function is2(value) {
				const candidate = value;
				return (
					candidate &&
					(CancellationStrategy.is(candidate.cancellationStrategy) ||
						ConnectionStrategy.is(candidate.connectionStrategy))
				);
			}
			ConnectionOptions2.is = is2;
		})(
			(ConnectionOptions =
				exports.ConnectionOptions || (exports.ConnectionOptions = {}))
		);
		let ConnectionState;
		(function (ConnectionState2) {
			ConnectionState2[(ConnectionState2['New'] = 1)] = 'New';
			ConnectionState2[(ConnectionState2['Listening'] = 2)] = 'Listening';
			ConnectionState2[(ConnectionState2['Closed'] = 3)] = 'Closed';
			ConnectionState2[(ConnectionState2['Disposed'] = 4)] = 'Disposed';
		})(ConnectionState || (ConnectionState = {}));
		function createMessageConnection(
			messageReader,
			messageWriter,
			_logger,
			options
		) {
			const logger = _logger !== void 0 ? _logger : exports.NullLogger;
			let sequenceNumber = 0;
			let notificationSequenceNumber = 0;
			let unknownResponseSequenceNumber = 0;
			const version = '2.0';
			let starRequestHandler = void 0;
			const requestHandlers = Object.create(null);
			let starNotificationHandler = void 0;
			const notificationHandlers = Object.create(null);
			const progressHandlers = new Map();
			let timer;
			let messageQueue = new linkedMap_1.LinkedMap();
			let responsePromises = Object.create(null);
			let knownCanceledRequests = new Set();
			let requestTokens = Object.create(null);
			let trace = Trace.Off;
			let traceFormat = TraceFormat.Text;
			let tracer;
			let state = ConnectionState.New;
			const errorEmitter = new events_1.Emitter();
			const closeEmitter = new events_1.Emitter();
			const unhandledNotificationEmitter = new events_1.Emitter();
			const unhandledProgressEmitter = new events_1.Emitter();
			const disposeEmitter = new events_1.Emitter();
			const cancellationStrategy =
				options && options.cancellationStrategy
					? options.cancellationStrategy
					: CancellationStrategy.Message;
			function createRequestQueueKey(id) {
				if (id === null) {
					throw new Error(
						`Can't send requests with id null since the response can't be correlated.`
					);
				}
				return 'req-' + id.toString();
			}
			function createResponseQueueKey(id) {
				if (id === null) {
					return 'res-unknown-' + (++unknownResponseSequenceNumber).toString();
				} else {
					return 'res-' + id.toString();
				}
			}
			function createNotificationQueueKey() {
				return 'not-' + (++notificationSequenceNumber).toString();
			}
			function addMessageToQueue(queue, message) {
				if (messages_1.Message.isRequest(message)) {
					queue.set(createRequestQueueKey(message.id), message);
				} else if (messages_1.Message.isResponse(message)) {
					queue.set(createResponseQueueKey(message.id), message);
				} else {
					queue.set(createNotificationQueueKey(), message);
				}
			}
			function cancelUndispatched(_message) {
				return void 0;
			}
			function isListening() {
				return state === ConnectionState.Listening;
			}
			function isClosed() {
				return state === ConnectionState.Closed;
			}
			function isDisposed() {
				return state === ConnectionState.Disposed;
			}
			function closeHandler() {
				if (
					state === ConnectionState.New ||
					state === ConnectionState.Listening
				) {
					state = ConnectionState.Closed;
					closeEmitter.fire(void 0);
				}
			}
			function readErrorHandler(error) {
				errorEmitter.fire([error, void 0, void 0]);
			}
			function writeErrorHandler(data) {
				errorEmitter.fire(data);
			}
			messageReader.onClose(closeHandler);
			messageReader.onError(readErrorHandler);
			messageWriter.onClose(closeHandler);
			messageWriter.onError(writeErrorHandler);
			function triggerMessageQueue() {
				if (timer || messageQueue.size === 0) {
					return;
				}
				timer = (0, ral_1.default)().timer.setImmediate(() => {
					timer = void 0;
					processMessageQueue();
				});
			}
			function processMessageQueue() {
				if (messageQueue.size === 0) {
					return;
				}
				const message = messageQueue.shift();
				try {
					if (messages_1.Message.isRequest(message)) {
						handleRequest(message);
					} else if (messages_1.Message.isNotification(message)) {
						handleNotification(message);
					} else if (messages_1.Message.isResponse(message)) {
						handleResponse(message);
					} else {
						handleInvalidMessage(message);
					}
				} finally {
					triggerMessageQueue();
				}
			}
			const callback = (message) => {
				try {
					if (
						messages_1.Message.isNotification(message) &&
						message.method === CancelNotification.type.method
					) {
						const cancelId = message.params.id;
						const key = createRequestQueueKey(cancelId);
						const toCancel = messageQueue.get(key);
						if (messages_1.Message.isRequest(toCancel)) {
							const strategy = options?.connectionStrategy;
							const response =
								strategy && strategy.cancelUndispatched
									? strategy.cancelUndispatched(toCancel, cancelUndispatched)
									: cancelUndispatched(toCancel);
							if (
								response &&
								(response.error !== void 0 || response.result !== void 0)
							) {
								messageQueue.delete(key);
								response.id = toCancel.id;
								traceSendingResponse(response, message.method, Date.now());
								messageWriter
									.write(response)
									.catch(() =>
										logger.error(
											`Sending response for canceled message failed.`
										)
									);
								return;
							}
						}
						const tokenKey = String(cancelId);
						const cancellationToken = requestTokens[tokenKey];
						if (cancellationToken !== void 0) {
							cancellationToken.cancel();
							traceReceivedNotification(message);
							return;
						} else {
							knownCanceledRequests.add(cancelId);
						}
					}
					addMessageToQueue(messageQueue, message);
				} finally {
					triggerMessageQueue();
				}
			};
			function handleRequest(requestMessage) {
				if (isDisposed()) {
					return;
				}
				function reply(resultOrError, method, startTime2) {
					const message = {
						jsonrpc: version,
						id: requestMessage.id,
					};
					if (resultOrError instanceof messages_1.ResponseError) {
						message.error = resultOrError.toJson();
					} else {
						message.result = resultOrError === void 0 ? null : resultOrError;
					}
					traceSendingResponse(message, method, startTime2);
					messageWriter
						.write(message)
						.catch(() => logger.error(`Sending response failed.`));
				}
				function replyError(error, method, startTime2) {
					const message = {
						jsonrpc: version,
						id: requestMessage.id,
						error: error.toJson(),
					};
					traceSendingResponse(message, method, startTime2);
					messageWriter
						.write(message)
						.catch(() => logger.error(`Sending response failed.`));
				}
				function replySuccess(result, method, startTime2) {
					if (result === void 0) {
						result = null;
					}
					const message = {
						jsonrpc: version,
						id: requestMessage.id,
						result,
					};
					traceSendingResponse(message, method, startTime2);
					messageWriter
						.write(message)
						.catch(() => logger.error(`Sending response failed.`));
				}
				traceReceivedRequest(requestMessage);
				const element = requestHandlers[requestMessage.method];
				let type;
				let requestHandler;
				if (element) {
					type = element.type;
					requestHandler = element.handler;
				}
				const startTime = Date.now();
				if (requestHandler || starRequestHandler) {
					const tokenKey = String(requestMessage.id);
					const cancellationSource = cancellationStrategy.receiver.createCancellationTokenSource(
						tokenKey
					);
					if (
						requestMessage.id !== null &&
						knownCanceledRequests.has(requestMessage.id)
					) {
						cancellationSource.cancel();
					}
					requestTokens[tokenKey] = cancellationSource;
					try {
						let handlerResult;
						if (requestHandler) {
							if (requestMessage.params === void 0) {
								if (type !== void 0 && type.numberOfParams !== 0) {
									replyError(
										new messages_1.ResponseError(
											messages_1.ErrorCodes.InvalidParams,
											`Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`
										),
										requestMessage.method,
										startTime
									);
									return;
								}
								handlerResult = requestHandler(cancellationSource.token);
							} else if (Array.isArray(requestMessage.params)) {
								if (
									type !== void 0 &&
									type.parameterStructures ===
										messages_1.ParameterStructures.byName
								) {
									replyError(
										new messages_1.ResponseError(
											messages_1.ErrorCodes.InvalidParams,
											`Request ${requestMessage.method} defines parameters by name but received parameters by position`
										),
										requestMessage.method,
										startTime
									);
									return;
								}
								handlerResult = requestHandler(
									...requestMessage.params,
									cancellationSource.token
								);
							} else {
								if (
									type !== void 0 &&
									type.parameterStructures ===
										messages_1.ParameterStructures.byPosition
								) {
									replyError(
										new messages_1.ResponseError(
											messages_1.ErrorCodes.InvalidParams,
											`Request ${requestMessage.method} defines parameters by position but received parameters by name`
										),
										requestMessage.method,
										startTime
									);
									return;
								}
								handlerResult = requestHandler(
									requestMessage.params,
									cancellationSource.token
								);
							}
						} else if (starRequestHandler) {
							handlerResult = starRequestHandler(
								requestMessage.method,
								requestMessage.params,
								cancellationSource.token
							);
						}
						const promise = handlerResult;
						if (!handlerResult) {
							delete requestTokens[tokenKey];
							replySuccess(handlerResult, requestMessage.method, startTime);
						} else if (promise.then) {
							promise.then(
								(resultOrError) => {
									delete requestTokens[tokenKey];
									reply(resultOrError, requestMessage.method, startTime);
								},
								(error) => {
									delete requestTokens[tokenKey];
									if (error instanceof messages_1.ResponseError) {
										replyError(error, requestMessage.method, startTime);
									} else if (error && Is2.string(error.message)) {
										replyError(
											new messages_1.ResponseError(
												messages_1.ErrorCodes.InternalError,
												`Request ${requestMessage.method} failed with message: ${error.message}`
											),
											requestMessage.method,
											startTime
										);
									} else {
										replyError(
											new messages_1.ResponseError(
												messages_1.ErrorCodes.InternalError,
												`Request ${requestMessage.method} failed unexpectedly without providing any details.`
											),
											requestMessage.method,
											startTime
										);
									}
								}
							);
						} else {
							delete requestTokens[tokenKey];
							reply(handlerResult, requestMessage.method, startTime);
						}
					} catch (error) {
						delete requestTokens[tokenKey];
						if (error instanceof messages_1.ResponseError) {
							reply(error, requestMessage.method, startTime);
						} else if (error && Is2.string(error.message)) {
							replyError(
								new messages_1.ResponseError(
									messages_1.ErrorCodes.InternalError,
									`Request ${requestMessage.method} failed with message: ${error.message}`
								),
								requestMessage.method,
								startTime
							);
						} else {
							replyError(
								new messages_1.ResponseError(
									messages_1.ErrorCodes.InternalError,
									`Request ${requestMessage.method} failed unexpectedly without providing any details.`
								),
								requestMessage.method,
								startTime
							);
						}
					}
				} else {
					replyError(
						new messages_1.ResponseError(
							messages_1.ErrorCodes.MethodNotFound,
							`Unhandled method ${requestMessage.method}`
						),
						requestMessage.method,
						startTime
					);
				}
			}
			function handleResponse(responseMessage) {
				if (isDisposed()) {
					return;
				}
				if (responseMessage.id === null) {
					if (responseMessage.error) {
						logger.error(`Received response message without id: Error is: 
${JSON.stringify(responseMessage.error, void 0, 4)}`);
					} else {
						logger.error(
							`Received response message without id. No further error information provided.`
						);
					}
				} else {
					const key = String(responseMessage.id);
					const responsePromise = responsePromises[key];
					traceReceivedResponse(responseMessage, responsePromise);
					if (responsePromise) {
						delete responsePromises[key];
						try {
							if (responseMessage.error) {
								const error = responseMessage.error;
								responsePromise.reject(
									new messages_1.ResponseError(
										error.code,
										error.message,
										error.data
									)
								);
							} else if (responseMessage.result !== void 0) {
								responsePromise.resolve(responseMessage.result);
							} else {
								throw new Error('Should never happen.');
							}
						} catch (error) {
							if (error.message) {
								logger.error(
									`Response handler '${responsePromise.method}' failed with message: ${error.message}`
								);
							} else {
								logger.error(
									`Response handler '${responsePromise.method}' failed unexpectedly.`
								);
							}
						}
					}
				}
			}
			function handleNotification(message) {
				if (isDisposed()) {
					return;
				}
				let type = void 0;
				let notificationHandler;
				if (message.method === CancelNotification.type.method) {
					const cancelId = message.params.id;
					knownCanceledRequests.delete(cancelId);
					traceReceivedNotification(message);
					return;
				} else {
					const element = notificationHandlers[message.method];
					if (element) {
						notificationHandler = element.handler;
						type = element.type;
					}
				}
				if (notificationHandler || starNotificationHandler) {
					try {
						traceReceivedNotification(message);
						if (notificationHandler) {
							if (message.params === void 0) {
								if (type !== void 0) {
									if (
										type.numberOfParams !== 0 &&
										type.parameterStructures !==
											messages_1.ParameterStructures.byName
									) {
										logger.error(
											`Notification ${message.method} defines ${type.numberOfParams} params but received none.`
										);
									}
								}
								notificationHandler();
							} else if (Array.isArray(message.params)) {
								const params = message.params;
								if (
									message.method === ProgressNotification.type.method &&
									params.length === 2 &&
									ProgressToken.is(params[0])
								) {
									notificationHandler({ token: params[0], value: params[1] });
								} else {
									if (type !== void 0) {
										if (
											type.parameterStructures ===
											messages_1.ParameterStructures.byName
										) {
											logger.error(
												`Notification ${message.method} defines parameters by name but received parameters by position`
											);
										}
										if (type.numberOfParams !== message.params.length) {
											logger.error(
												`Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`
											);
										}
									}
									notificationHandler(...params);
								}
							} else {
								if (
									type !== void 0 &&
									type.parameterStructures ===
										messages_1.ParameterStructures.byPosition
								) {
									logger.error(
										`Notification ${message.method} defines parameters by position but received parameters by name`
									);
								}
								notificationHandler(message.params);
							}
						} else if (starNotificationHandler) {
							starNotificationHandler(message.method, message.params);
						}
					} catch (error) {
						if (error.message) {
							logger.error(
								`Notification handler '${message.method}' failed with message: ${error.message}`
							);
						} else {
							logger.error(
								`Notification handler '${message.method}' failed unexpectedly.`
							);
						}
					}
				} else {
					unhandledNotificationEmitter.fire(message);
				}
			}
			function handleInvalidMessage(message) {
				if (!message) {
					logger.error('Received empty message.');
					return;
				}
				logger.error(`Received message which is neither a response nor a notification message:
${JSON.stringify(message, null, 4)}`);
				const responseMessage = message;
				if (Is2.string(responseMessage.id) || Is2.number(responseMessage.id)) {
					const key = String(responseMessage.id);
					const responseHandler = responsePromises[key];
					if (responseHandler) {
						responseHandler.reject(
							new Error(
								'The received response has neither a result nor an error property.'
							)
						);
					}
				}
			}
			function stringifyTrace(params) {
				if (params === void 0 || params === null) {
					return void 0;
				}
				switch (trace) {
					case Trace.Verbose:
						return JSON.stringify(params, null, 4);
					case Trace.Compact:
						return JSON.stringify(params);
					default:
						return void 0;
				}
			}
			function traceSendingRequest(message) {
				if (trace === Trace.Off || !tracer) {
					return;
				}
				if (traceFormat === TraceFormat.Text) {
					let data = void 0;
					if (
						(trace === Trace.Verbose || trace === Trace.Compact) &&
						message.params
					) {
						data = `Params: ${stringifyTrace(message.params)}

`;
					}
					tracer.log(
						`Sending request '${message.method} - (${message.id})'.`,
						data
					);
				} else {
					logLSPMessage('send-request', message);
				}
			}
			function traceSendingNotification(message) {
				if (trace === Trace.Off || !tracer) {
					return;
				}
				if (traceFormat === TraceFormat.Text) {
					let data = void 0;
					if (trace === Trace.Verbose || trace === Trace.Compact) {
						if (message.params) {
							data = `Params: ${stringifyTrace(message.params)}

`;
						} else {
							data = 'No parameters provided.\n\n';
						}
					}
					tracer.log(`Sending notification '${message.method}'.`, data);
				} else {
					logLSPMessage('send-notification', message);
				}
			}
			function traceSendingResponse(message, method, startTime) {
				if (trace === Trace.Off || !tracer) {
					return;
				}
				if (traceFormat === TraceFormat.Text) {
					let data = void 0;
					if (trace === Trace.Verbose || trace === Trace.Compact) {
						if (message.error && message.error.data) {
							data = `Error data: ${stringifyTrace(message.error.data)}

`;
						} else {
							if (message.result) {
								data = `Result: ${stringifyTrace(message.result)}

`;
							} else if (message.error === void 0) {
								data = 'No result returned.\n\n';
							}
						}
					}
					tracer.log(
						`Sending response '${method} - (${
							message.id
						})'. Processing request took ${Date.now() - startTime}ms`,
						data
					);
				} else {
					logLSPMessage('send-response', message);
				}
			}
			function traceReceivedRequest(message) {
				if (trace === Trace.Off || !tracer) {
					return;
				}
				if (traceFormat === TraceFormat.Text) {
					let data = void 0;
					if (
						(trace === Trace.Verbose || trace === Trace.Compact) &&
						message.params
					) {
						data = `Params: ${stringifyTrace(message.params)}

`;
					}
					tracer.log(
						`Received request '${message.method} - (${message.id})'.`,
						data
					);
				} else {
					logLSPMessage('receive-request', message);
				}
			}
			function traceReceivedNotification(message) {
				if (
					trace === Trace.Off ||
					!tracer ||
					message.method === LogTraceNotification.type.method
				) {
					return;
				}
				if (traceFormat === TraceFormat.Text) {
					let data = void 0;
					if (trace === Trace.Verbose || trace === Trace.Compact) {
						if (message.params) {
							data = `Params: ${stringifyTrace(message.params)}

`;
						} else {
							data = 'No parameters provided.\n\n';
						}
					}
					tracer.log(`Received notification '${message.method}'.`, data);
				} else {
					logLSPMessage('receive-notification', message);
				}
			}
			function traceReceivedResponse(message, responsePromise) {
				if (trace === Trace.Off || !tracer) {
					return;
				}
				if (traceFormat === TraceFormat.Text) {
					let data = void 0;
					if (trace === Trace.Verbose || trace === Trace.Compact) {
						if (message.error && message.error.data) {
							data = `Error data: ${stringifyTrace(message.error.data)}

`;
						} else {
							if (message.result) {
								data = `Result: ${stringifyTrace(message.result)}

`;
							} else if (message.error === void 0) {
								data = 'No result returned.\n\n';
							}
						}
					}
					if (responsePromise) {
						const error = message.error
							? ` Request failed: ${message.error.message} (${message.error.code}).`
							: '';
						tracer.log(
							`Received response '${responsePromise.method} - (${
								message.id
							})' in ${Date.now() - responsePromise.timerStart}ms.${error}`,
							data
						);
					} else {
						tracer.log(
							`Received response ${message.id} without active response promise.`,
							data
						);
					}
				} else {
					logLSPMessage('receive-response', message);
				}
			}
			function logLSPMessage(type, message) {
				if (!tracer || trace === Trace.Off) {
					return;
				}
				const lspMessage = {
					isLSPMessage: true,
					type,
					message,
					timestamp: Date.now(),
				};
				tracer.log(lspMessage);
			}
			function throwIfClosedOrDisposed() {
				if (isClosed()) {
					throw new ConnectionError(
						ConnectionErrors.Closed,
						'Connection is closed.'
					);
				}
				if (isDisposed()) {
					throw new ConnectionError(
						ConnectionErrors.Disposed,
						'Connection is disposed.'
					);
				}
			}
			function throwIfListening() {
				if (isListening()) {
					throw new ConnectionError(
						ConnectionErrors.AlreadyListening,
						'Connection is already listening'
					);
				}
			}
			function throwIfNotListening() {
				if (!isListening()) {
					throw new Error('Call listen() first.');
				}
			}
			function undefinedToNull(param) {
				if (param === void 0) {
					return null;
				} else {
					return param;
				}
			}
			function nullToUndefined(param) {
				if (param === null) {
					return void 0;
				} else {
					return param;
				}
			}
			function isNamedParam(param) {
				return (
					param !== void 0 &&
					param !== null &&
					!Array.isArray(param) &&
					typeof param === 'object'
				);
			}
			function computeSingleParam(parameterStructures, param) {
				switch (parameterStructures) {
					case messages_1.ParameterStructures.auto:
						if (isNamedParam(param)) {
							return nullToUndefined(param);
						} else {
							return [undefinedToNull(param)];
						}
					case messages_1.ParameterStructures.byName:
						if (!isNamedParam(param)) {
							throw new Error(
								`Received parameters by name but param is not an object literal.`
							);
						}
						return nullToUndefined(param);
					case messages_1.ParameterStructures.byPosition:
						return [undefinedToNull(param)];
					default:
						throw new Error(
							`Unknown parameter structure ${parameterStructures.toString()}`
						);
				}
			}
			function computeMessageParams(type, params) {
				let result;
				const numberOfParams = type.numberOfParams;
				switch (numberOfParams) {
					case 0:
						result = void 0;
						break;
					case 1:
						result = computeSingleParam(type.parameterStructures, params[0]);
						break;
					default:
						result = [];
						for (let i = 0; i < params.length && i < numberOfParams; i++) {
							result.push(undefinedToNull(params[i]));
						}
						if (params.length < numberOfParams) {
							for (let i = params.length; i < numberOfParams; i++) {
								result.push(null);
							}
						}
						break;
				}
				return result;
			}
			const connection = {
				sendNotification: (type, ...args) => {
					throwIfClosedOrDisposed();
					let method;
					let messageParams;
					if (Is2.string(type)) {
						method = type;
						const first = args[0];
						let paramStart = 0;
						let parameterStructures = messages_1.ParameterStructures.auto;
						if (messages_1.ParameterStructures.is(first)) {
							paramStart = 1;
							parameterStructures = first;
						}
						let paramEnd = args.length;
						const numberOfParams = paramEnd - paramStart;
						switch (numberOfParams) {
							case 0:
								messageParams = void 0;
								break;
							case 1:
								messageParams = computeSingleParam(
									parameterStructures,
									args[paramStart]
								);
								break;
							default:
								if (
									parameterStructures === messages_1.ParameterStructures.byName
								) {
									throw new Error(
										`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`
									);
								}
								messageParams = args
									.slice(paramStart, paramEnd)
									.map((value) => undefinedToNull(value));
								break;
						}
					} else {
						const params = args;
						method = type.method;
						messageParams = computeMessageParams(type, params);
					}
					const notificationMessage = {
						jsonrpc: version,
						method,
						params: messageParams,
					};
					traceSendingNotification(notificationMessage);
					return messageWriter
						.write(notificationMessage)
						.catch(() => logger.error(`Sending notification failed.`));
				},
				onNotification: (type, handler) => {
					throwIfClosedOrDisposed();
					let method;
					if (Is2.func(type)) {
						starNotificationHandler = type;
					} else if (handler) {
						if (Is2.string(type)) {
							method = type;
							notificationHandlers[type] = { type: void 0, handler };
						} else {
							method = type.method;
							notificationHandlers[type.method] = { type, handler };
						}
					}
					return {
						dispose: () => {
							if (method !== void 0) {
								delete notificationHandlers[method];
							} else {
								starNotificationHandler = void 0;
							}
						},
					};
				},
				onProgress: (_type, token, handler) => {
					if (progressHandlers.has(token)) {
						throw new Error(
							`Progress handler for token ${token} already registered`
						);
					}
					progressHandlers.set(token, handler);
					return {
						dispose: () => {
							progressHandlers.delete(token);
						},
					};
				},
				sendProgress: (_type, token, value) => {
					return connection.sendNotification(ProgressNotification.type, {
						token,
						value,
					});
				},
				onUnhandledProgress: unhandledProgressEmitter.event,
				sendRequest: (type, ...args) => {
					throwIfClosedOrDisposed();
					throwIfNotListening();
					let method;
					let messageParams;
					let token = void 0;
					if (Is2.string(type)) {
						method = type;
						const first = args[0];
						const last = args[args.length - 1];
						let paramStart = 0;
						let parameterStructures = messages_1.ParameterStructures.auto;
						if (messages_1.ParameterStructures.is(first)) {
							paramStart = 1;
							parameterStructures = first;
						}
						let paramEnd = args.length;
						if (cancellation_1.CancellationToken.is(last)) {
							paramEnd = paramEnd - 1;
							token = last;
						}
						const numberOfParams = paramEnd - paramStart;
						switch (numberOfParams) {
							case 0:
								messageParams = void 0;
								break;
							case 1:
								messageParams = computeSingleParam(
									parameterStructures,
									args[paramStart]
								);
								break;
							default:
								if (
									parameterStructures === messages_1.ParameterStructures.byName
								) {
									throw new Error(
										`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`
									);
								}
								messageParams = args
									.slice(paramStart, paramEnd)
									.map((value) => undefinedToNull(value));
								break;
						}
					} else {
						const params = args;
						method = type.method;
						messageParams = computeMessageParams(type, params);
						const numberOfParams = type.numberOfParams;
						token = cancellation_1.CancellationToken.is(params[numberOfParams])
							? params[numberOfParams]
							: void 0;
					}
					const id = sequenceNumber++;
					let disposable;
					if (token) {
						disposable = token.onCancellationRequested(() => {
							const p = cancellationStrategy.sender.sendCancellation(
								connection,
								id
							);
							if (p === void 0) {
								logger.log(
									`Received no promise from cancellation strategy when cancelling id ${id}`
								);
								return Promise.resolve();
							} else {
								return p.catch(() => {
									logger.log(
										`Sending cancellation messages for id ${id} failed`
									);
								});
							}
						});
					}
					const result = new Promise((resolve, reject) => {
						const requestMessage = {
							jsonrpc: version,
							id,
							method,
							params: messageParams,
						};
						const resolveWithCleanup = (r) => {
							resolve(r);
							cancellationStrategy.sender.cleanup(id);
							disposable?.dispose();
						};
						const rejectWithCleanup = (r) => {
							reject(r);
							cancellationStrategy.sender.cleanup(id);
							disposable?.dispose();
						};
						let responsePromise = {
							method,
							timerStart: Date.now(),
							resolve: resolveWithCleanup,
							reject: rejectWithCleanup,
						};
						traceSendingRequest(requestMessage);
						try {
							messageWriter
								.write(requestMessage)
								.catch(() => logger.error(`Sending request failed.`));
						} catch (e) {
							responsePromise.reject(
								new messages_1.ResponseError(
									messages_1.ErrorCodes.MessageWriteError,
									e.message ? e.message : 'Unknown reason'
								)
							);
							responsePromise = null;
						}
						if (responsePromise) {
							responsePromises[String(id)] = responsePromise;
						}
					});
					return result;
				},
				onRequest: (type, handler) => {
					throwIfClosedOrDisposed();
					let method = null;
					if (StarRequestHandler.is(type)) {
						method = void 0;
						starRequestHandler = type;
					} else if (Is2.string(type)) {
						method = null;
						if (handler !== void 0) {
							method = type;
							requestHandlers[type] = { handler, type: void 0 };
						}
					} else {
						if (handler !== void 0) {
							method = type.method;
							requestHandlers[type.method] = { type, handler };
						}
					}
					return {
						dispose: () => {
							if (method === null) {
								return;
							}
							if (method !== void 0) {
								delete requestHandlers[method];
							} else {
								starRequestHandler = void 0;
							}
						},
					};
				},
				trace: (_value, _tracer, sendNotificationOrTraceOptions) => {
					let _sendNotification = false;
					let _traceFormat = TraceFormat.Text;
					if (sendNotificationOrTraceOptions !== void 0) {
						if (Is2.boolean(sendNotificationOrTraceOptions)) {
							_sendNotification = sendNotificationOrTraceOptions;
						} else {
							_sendNotification =
								sendNotificationOrTraceOptions.sendNotification || false;
							_traceFormat =
								sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
						}
					}
					trace = _value;
					traceFormat = _traceFormat;
					if (trace === Trace.Off) {
						tracer = void 0;
					} else {
						tracer = _tracer;
					}
					if (_sendNotification && !isClosed() && !isDisposed()) {
						connection
							.sendNotification(SetTraceNotification.type, {
								value: Trace.toString(_value),
							})
							.catch(() => {
								logger.error(`Sending trace notification failed`);
							});
					}
				},
				onError: errorEmitter.event,
				onClose: closeEmitter.event,
				onUnhandledNotification: unhandledNotificationEmitter.event,
				onDispose: disposeEmitter.event,
				end: () => {
					messageWriter.end();
				},
				dispose: () => {
					if (isDisposed()) {
						return;
					}
					state = ConnectionState.Disposed;
					disposeEmitter.fire(void 0);
					const error = new Error('Connection got disposed.');
					Object.keys(responsePromises).forEach((key) => {
						responsePromises[key].reject(error);
					});
					responsePromises = Object.create(null);
					requestTokens = Object.create(null);
					knownCanceledRequests = new Set();
					messageQueue = new linkedMap_1.LinkedMap();
					if (Is2.func(messageWriter.dispose)) {
						messageWriter.dispose();
					}
					if (Is2.func(messageReader.dispose)) {
						messageReader.dispose();
					}
				},
				listen: () => {
					throwIfClosedOrDisposed();
					throwIfListening();
					state = ConnectionState.Listening;
					messageReader.listen(callback);
				},
				inspect: () => {
					(0, ral_1.default)().console.log('inspect');
				},
			};
			connection.onNotification(LogTraceNotification.type, (params) => {
				if (trace === Trace.Off || !tracer) {
					return;
				}
				const verbose = trace === Trace.Verbose || trace === Trace.Compact;
				tracer.log(params.message, verbose ? params.verbose : void 0);
			});
			connection.onNotification(ProgressNotification.type, (params) => {
				const handler = progressHandlers.get(params.token);
				if (handler) {
					handler(params.value);
				} else {
					unhandledProgressEmitter.fire(params);
				}
			});
			return connection;
		}
		exports.createMessageConnection = createMessageConnection;
	},
});

// client/node_modules/vscode-jsonrpc/lib/common/api.js
let require_api = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/common/api.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.SetTraceNotification = exports.TraceFormat = exports.Trace = exports.ProgressType = exports.ProgressToken = exports.createMessageConnection = exports.NullLogger = exports.ConnectionOptions = exports.ConnectionStrategy = exports.WriteableStreamMessageWriter = exports.AbstractMessageWriter = exports.MessageWriter = exports.ReadableStreamMessageReader = exports.AbstractMessageReader = exports.MessageReader = exports.CancellationToken = exports.CancellationTokenSource = exports.Emitter = exports.Event = exports.Disposable = exports.LRUCache = exports.Touch = exports.LinkedMap = exports.ParameterStructures = exports.NotificationType9 = exports.NotificationType8 = exports.NotificationType7 = exports.NotificationType6 = exports.NotificationType5 = exports.NotificationType4 = exports.NotificationType3 = exports.NotificationType2 = exports.NotificationType1 = exports.NotificationType0 = exports.NotificationType = exports.ErrorCodes = exports.ResponseError = exports.RequestType9 = exports.RequestType8 = exports.RequestType7 = exports.RequestType6 = exports.RequestType5 = exports.RequestType4 = exports.RequestType3 = exports.RequestType2 = exports.RequestType1 = exports.RequestType0 = exports.RequestType = exports.Message = exports.RAL = void 0;
		exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.CancellationReceiverStrategy = exports.ConnectionError = exports.ConnectionErrors = exports.LogTraceNotification = void 0;
		let messages_1 = require_messages();
		Object.defineProperty(exports, 'Message', {
			enumerable: true,
			get: function () {
				return messages_1.Message;
			},
		});
		Object.defineProperty(exports, 'RequestType', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType;
			},
		});
		Object.defineProperty(exports, 'RequestType0', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType0;
			},
		});
		Object.defineProperty(exports, 'RequestType1', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType1;
			},
		});
		Object.defineProperty(exports, 'RequestType2', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType2;
			},
		});
		Object.defineProperty(exports, 'RequestType3', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType3;
			},
		});
		Object.defineProperty(exports, 'RequestType4', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType4;
			},
		});
		Object.defineProperty(exports, 'RequestType5', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType5;
			},
		});
		Object.defineProperty(exports, 'RequestType6', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType6;
			},
		});
		Object.defineProperty(exports, 'RequestType7', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType7;
			},
		});
		Object.defineProperty(exports, 'RequestType8', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType8;
			},
		});
		Object.defineProperty(exports, 'RequestType9', {
			enumerable: true,
			get: function () {
				return messages_1.RequestType9;
			},
		});
		Object.defineProperty(exports, 'ResponseError', {
			enumerable: true,
			get: function () {
				return messages_1.ResponseError;
			},
		});
		Object.defineProperty(exports, 'ErrorCodes', {
			enumerable: true,
			get: function () {
				return messages_1.ErrorCodes;
			},
		});
		Object.defineProperty(exports, 'NotificationType', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType;
			},
		});
		Object.defineProperty(exports, 'NotificationType0', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType0;
			},
		});
		Object.defineProperty(exports, 'NotificationType1', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType1;
			},
		});
		Object.defineProperty(exports, 'NotificationType2', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType2;
			},
		});
		Object.defineProperty(exports, 'NotificationType3', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType3;
			},
		});
		Object.defineProperty(exports, 'NotificationType4', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType4;
			},
		});
		Object.defineProperty(exports, 'NotificationType5', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType5;
			},
		});
		Object.defineProperty(exports, 'NotificationType6', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType6;
			},
		});
		Object.defineProperty(exports, 'NotificationType7', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType7;
			},
		});
		Object.defineProperty(exports, 'NotificationType8', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType8;
			},
		});
		Object.defineProperty(exports, 'NotificationType9', {
			enumerable: true,
			get: function () {
				return messages_1.NotificationType9;
			},
		});
		Object.defineProperty(exports, 'ParameterStructures', {
			enumerable: true,
			get: function () {
				return messages_1.ParameterStructures;
			},
		});
		let linkedMap_1 = require_linkedMap();
		Object.defineProperty(exports, 'LinkedMap', {
			enumerable: true,
			get: function () {
				return linkedMap_1.LinkedMap;
			},
		});
		Object.defineProperty(exports, 'LRUCache', {
			enumerable: true,
			get: function () {
				return linkedMap_1.LRUCache;
			},
		});
		Object.defineProperty(exports, 'Touch', {
			enumerable: true,
			get: function () {
				return linkedMap_1.Touch;
			},
		});
		let disposable_1 = require_disposable();
		Object.defineProperty(exports, 'Disposable', {
			enumerable: true,
			get: function () {
				return disposable_1.Disposable;
			},
		});
		let events_1 = require_events();
		Object.defineProperty(exports, 'Event', {
			enumerable: true,
			get: function () {
				return events_1.Event;
			},
		});
		Object.defineProperty(exports, 'Emitter', {
			enumerable: true,
			get: function () {
				return events_1.Emitter;
			},
		});
		let cancellation_1 = require_cancellation();
		Object.defineProperty(exports, 'CancellationTokenSource', {
			enumerable: true,
			get: function () {
				return cancellation_1.CancellationTokenSource;
			},
		});
		Object.defineProperty(exports, 'CancellationToken', {
			enumerable: true,
			get: function () {
				return cancellation_1.CancellationToken;
			},
		});
		let messageReader_1 = require_messageReader();
		Object.defineProperty(exports, 'MessageReader', {
			enumerable: true,
			get: function () {
				return messageReader_1.MessageReader;
			},
		});
		Object.defineProperty(exports, 'AbstractMessageReader', {
			enumerable: true,
			get: function () {
				return messageReader_1.AbstractMessageReader;
			},
		});
		Object.defineProperty(exports, 'ReadableStreamMessageReader', {
			enumerable: true,
			get: function () {
				return messageReader_1.ReadableStreamMessageReader;
			},
		});
		let messageWriter_1 = require_messageWriter();
		Object.defineProperty(exports, 'MessageWriter', {
			enumerable: true,
			get: function () {
				return messageWriter_1.MessageWriter;
			},
		});
		Object.defineProperty(exports, 'AbstractMessageWriter', {
			enumerable: true,
			get: function () {
				return messageWriter_1.AbstractMessageWriter;
			},
		});
		Object.defineProperty(exports, 'WriteableStreamMessageWriter', {
			enumerable: true,
			get: function () {
				return messageWriter_1.WriteableStreamMessageWriter;
			},
		});
		let connection_1 = require_connection();
		Object.defineProperty(exports, 'ConnectionStrategy', {
			enumerable: true,
			get: function () {
				return connection_1.ConnectionStrategy;
			},
		});
		Object.defineProperty(exports, 'ConnectionOptions', {
			enumerable: true,
			get: function () {
				return connection_1.ConnectionOptions;
			},
		});
		Object.defineProperty(exports, 'NullLogger', {
			enumerable: true,
			get: function () {
				return connection_1.NullLogger;
			},
		});
		Object.defineProperty(exports, 'createMessageConnection', {
			enumerable: true,
			get: function () {
				return connection_1.createMessageConnection;
			},
		});
		Object.defineProperty(exports, 'ProgressToken', {
			enumerable: true,
			get: function () {
				return connection_1.ProgressToken;
			},
		});
		Object.defineProperty(exports, 'ProgressType', {
			enumerable: true,
			get: function () {
				return connection_1.ProgressType;
			},
		});
		Object.defineProperty(exports, 'Trace', {
			enumerable: true,
			get: function () {
				return connection_1.Trace;
			},
		});
		Object.defineProperty(exports, 'TraceFormat', {
			enumerable: true,
			get: function () {
				return connection_1.TraceFormat;
			},
		});
		Object.defineProperty(exports, 'SetTraceNotification', {
			enumerable: true,
			get: function () {
				return connection_1.SetTraceNotification;
			},
		});
		Object.defineProperty(exports, 'LogTraceNotification', {
			enumerable: true,
			get: function () {
				return connection_1.LogTraceNotification;
			},
		});
		Object.defineProperty(exports, 'ConnectionErrors', {
			enumerable: true,
			get: function () {
				return connection_1.ConnectionErrors;
			},
		});
		Object.defineProperty(exports, 'ConnectionError', {
			enumerable: true,
			get: function () {
				return connection_1.ConnectionError;
			},
		});
		Object.defineProperty(exports, 'CancellationReceiverStrategy', {
			enumerable: true,
			get: function () {
				return connection_1.CancellationReceiverStrategy;
			},
		});
		Object.defineProperty(exports, 'CancellationSenderStrategy', {
			enumerable: true,
			get: function () {
				return connection_1.CancellationSenderStrategy;
			},
		});
		Object.defineProperty(exports, 'CancellationStrategy', {
			enumerable: true,
			get: function () {
				return connection_1.CancellationStrategy;
			},
		});
		let ral_1 = require_ral();
		exports.RAL = ral_1.default;
	},
});

// client/node_modules/vscode-jsonrpc/lib/browser/main.js
let require_main = __commonJS({
	'client/node_modules/vscode-jsonrpc/lib/browser/main.js'(exports) {
		'use strict';
		let __createBinding =
			(exports && exports.__createBinding) ||
			(Object.create
				? function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						Object.defineProperty(o, k2, {
							enumerable: true,
							get: function () {
								return m[k];
							},
						});
				  }
				: function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						o[k2] = m[k];
				  });
		let __exportStar =
			(exports && exports.__exportStar) ||
			function (m, exports2) {
				for (let p in m) {
					if (
						p !== 'default' &&
						!Object.prototype.hasOwnProperty.call(exports2, p)
					) {
						__createBinding(exports2, m, p);
					}
				}
			};
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.createMessageConnection = exports.BrowserMessageWriter = exports.BrowserMessageReader = void 0;
		let ril_1 = require_ril();
		ril_1.default.install();
		let api_1 = require_api();
		__exportStar(require_api(), exports);
		let BrowserMessageReader = class extends api_1.AbstractMessageReader {
			constructor(context) {
				super();
				this._onData = new api_1.Emitter();
				this._messageListener = (event) => {
					this._onData.fire(event.data);
				};
				context.addEventListener('error', (event) => this.fireError(event));
				context.onmessage = this._messageListener;
			}
			listen(callback) {
				return this._onData.event(callback);
			}
		};
		exports.BrowserMessageReader = BrowserMessageReader;
		let BrowserMessageWriter = class extends api_1.AbstractMessageWriter {
			constructor(context) {
				super();
				this.context = context;
				this.errorCount = 0;
				context.addEventListener('error', (event) => this.fireError(event));
			}
			write(msg) {
				try {
					this.context.postMessage(msg);
					return Promise.resolve();
				} catch (error) {
					this.handleError(error, msg);
					return Promise.reject(error);
				}
			}
			handleError(error, msg) {
				this.errorCount++;
				this.fireError(error, msg, this.errorCount);
			}
			end() {}
		};
		exports.BrowserMessageWriter = BrowserMessageWriter;
		function createMessageConnection(reader, writer, logger, options) {
			if (logger === void 0) {
				logger = api_1.NullLogger;
			}
			if (api_1.ConnectionStrategy.is(options)) {
				options = { connectionStrategy: options };
			}
			return (0, api_1.createMessageConnection)(
				reader,
				writer,
				logger,
				options
			);
		}
		exports.createMessageConnection = createMessageConnection;
	},
});

// client/node_modules/vscode-jsonrpc/browser.js
let require_browser = __commonJS({
	'client/node_modules/vscode-jsonrpc/browser.js'(exports, module2) {
		'use strict';
		module2.exports = require_main();
	},
});

// client/node_modules/vscode-languageserver-types/lib/umd/main.js
let require_main2 = __commonJS({
	'client/node_modules/vscode-languageserver-types/lib/umd/main.js'(
		exports,
		module2
	) {
		(function (factory) {
			if (typeof module2 === 'object' && typeof module2.exports === 'object') {
				let v = factory(require, exports);
				if (v !== void 0) {
					module2.exports = v;
				}
			} else if (typeof define === 'function' && define.amd) {
				define(['require', 'exports'], factory);
			}
		})(function (require2, exports2) {
			'use strict';
			Object.defineProperty(exports2, '__esModule', { value: true });
			exports2.TextDocument = exports2.EOL = exports2.InlineValuesContext = exports2.InlineValueEvaluatableExpression = exports2.InlineValueVariableLookup = exports2.InlineValueText = exports2.SemanticTokens = exports2.SemanticTokenModifiers = exports2.SemanticTokenTypes = exports2.SelectionRange = exports2.DocumentLink = exports2.FormattingOptions = exports2.CodeLens = exports2.CodeAction = exports2.CodeActionContext = exports2.CodeActionTriggerKind = exports2.CodeActionKind = exports2.DocumentSymbol = exports2.WorkspaceSymbol = exports2.SymbolInformation = exports2.SymbolTag = exports2.SymbolKind = exports2.DocumentHighlight = exports2.DocumentHighlightKind = exports2.SignatureInformation = exports2.ParameterInformation = exports2.Hover = exports2.MarkedString = exports2.CompletionList = exports2.CompletionItem = exports2.CompletionItemLabelDetails = exports2.InsertTextMode = exports2.InsertReplaceEdit = exports2.CompletionItemTag = exports2.InsertTextFormat = exports2.CompletionItemKind = exports2.MarkupContent = exports2.MarkupKind = exports2.TextDocumentItem = exports2.OptionalVersionedTextDocumentIdentifier = exports2.VersionedTextDocumentIdentifier = exports2.TextDocumentIdentifier = exports2.WorkspaceChange = exports2.WorkspaceEdit = exports2.DeleteFile = exports2.RenameFile = exports2.CreateFile = exports2.TextDocumentEdit = exports2.AnnotatedTextEdit = exports2.ChangeAnnotationIdentifier = exports2.ChangeAnnotation = exports2.TextEdit = exports2.Command = exports2.Diagnostic = exports2.CodeDescription = exports2.DiagnosticTag = exports2.DiagnosticSeverity = exports2.DiagnosticRelatedInformation = exports2.FoldingRange = exports2.FoldingRangeKind = exports2.ColorPresentation = exports2.ColorInformation = exports2.Color = exports2.LocationLink = exports2.Location = exports2.Range = exports2.Position = exports2.uinteger = exports2.integer = void 0;
			let integer;
			(function (integer2) {
				integer2.MIN_VALUE = -2147483648;
				integer2.MAX_VALUE = 2147483647;
			})((integer = exports2.integer || (exports2.integer = {})));
			let uinteger;
			(function (uinteger2) {
				uinteger2.MIN_VALUE = 0;
				uinteger2.MAX_VALUE = 2147483647;
			})((uinteger = exports2.uinteger || (exports2.uinteger = {})));
			let Position;
			(function (Position2) {
				function create(line, character) {
					if (line === Number.MAX_VALUE) {
						line = uinteger.MAX_VALUE;
					}
					if (character === Number.MAX_VALUE) {
						character = uinteger.MAX_VALUE;
					}
					return { line, character };
				}
				Position2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Is2.uinteger(candidate.line) &&
						Is2.uinteger(candidate.character)
					);
				}
				Position2.is = is2;
			})((Position = exports2.Position || (exports2.Position = {})));
			let Range;
			(function (Range2) {
				function create(one, two, three, four) {
					if (
						Is2.uinteger(one) &&
						Is2.uinteger(two) &&
						Is2.uinteger(three) &&
						Is2.uinteger(four)
					) {
						return {
							start: Position.create(one, two),
							end: Position.create(three, four),
						};
					} else if (Position.is(one) && Position.is(two)) {
						return { start: one, end: two };
					} else {
						throw new Error(
							'Range#create called with invalid arguments['
								.concat(one, ', ')
								.concat(two, ', ')
								.concat(three, ', ')
								.concat(four, ']')
						);
					}
				}
				Range2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Position.is(candidate.start) &&
						Position.is(candidate.end)
					);
				}
				Range2.is = is2;
			})((Range = exports2.Range || (exports2.Range = {})));
			let Location;
			(function (Location2) {
				function create(uri, range) {
					return { uri, range };
				}
				Location2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Range.is(candidate.range) &&
						(Is2.string(candidate.uri) || Is2.undefined(candidate.uri))
					);
				}
				Location2.is = is2;
			})((Location = exports2.Location || (exports2.Location = {})));
			let LocationLink;
			(function (LocationLink2) {
				function create(
					targetUri,
					targetRange,
					targetSelectionRange,
					originSelectionRange
				) {
					return {
						targetUri,
						targetRange,
						targetSelectionRange,
						originSelectionRange,
					};
				}
				LocationLink2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Range.is(candidate.targetRange) &&
						Is2.string(candidate.targetUri) &&
						Range.is(candidate.targetSelectionRange) &&
						(Range.is(candidate.originSelectionRange) ||
							Is2.undefined(candidate.originSelectionRange))
					);
				}
				LocationLink2.is = is2;
			})(
				(LocationLink = exports2.LocationLink || (exports2.LocationLink = {}))
			);
			let Color;
			(function (Color2) {
				function create(red, green, blue, alpha) {
					return {
						red,
						green,
						blue,
						alpha,
					};
				}
				Color2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Is2.numberRange(candidate.red, 0, 1) &&
						Is2.numberRange(candidate.green, 0, 1) &&
						Is2.numberRange(candidate.blue, 0, 1) &&
						Is2.numberRange(candidate.alpha, 0, 1)
					);
				}
				Color2.is = is2;
			})((Color = exports2.Color || (exports2.Color = {})));
			let ColorInformation;
			(function (ColorInformation2) {
				function create(range, color) {
					return {
						range,
						color,
					};
				}
				ColorInformation2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Range.is(candidate.range) &&
						Color.is(candidate.color)
					);
				}
				ColorInformation2.is = is2;
			})(
				(ColorInformation =
					exports2.ColorInformation || (exports2.ColorInformation = {}))
			);
			let ColorPresentation;
			(function (ColorPresentation2) {
				function create(label, textEdit, additionalTextEdits) {
					return {
						label,
						textEdit,
						additionalTextEdits,
					};
				}
				ColorPresentation2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Is2.string(candidate.label) &&
						(Is2.undefined(candidate.textEdit) || TextEdit.is(candidate)) &&
						(Is2.undefined(candidate.additionalTextEdits) ||
							Is2.typedArray(candidate.additionalTextEdits, TextEdit.is))
					);
				}
				ColorPresentation2.is = is2;
			})(
				(ColorPresentation =
					exports2.ColorPresentation || (exports2.ColorPresentation = {}))
			);
			let FoldingRangeKind;
			(function (FoldingRangeKind2) {
				FoldingRangeKind2['Comment'] = 'comment';
				FoldingRangeKind2['Imports'] = 'imports';
				FoldingRangeKind2['Region'] = 'region';
			})(
				(FoldingRangeKind =
					exports2.FoldingRangeKind || (exports2.FoldingRangeKind = {}))
			);
			let FoldingRange;
			(function (FoldingRange2) {
				function create(
					startLine,
					endLine,
					startCharacter,
					endCharacter,
					kind
				) {
					let result = {
						startLine,
						endLine,
					};
					if (Is2.defined(startCharacter)) {
						result.startCharacter = startCharacter;
					}
					if (Is2.defined(endCharacter)) {
						result.endCharacter = endCharacter;
					}
					if (Is2.defined(kind)) {
						result.kind = kind;
					}
					return result;
				}
				FoldingRange2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Is2.uinteger(candidate.startLine) &&
						Is2.uinteger(candidate.startLine) &&
						(Is2.undefined(candidate.startCharacter) ||
							Is2.uinteger(candidate.startCharacter)) &&
						(Is2.undefined(candidate.endCharacter) ||
							Is2.uinteger(candidate.endCharacter)) &&
						(Is2.undefined(candidate.kind) || Is2.string(candidate.kind))
					);
				}
				FoldingRange2.is = is2;
			})(
				(FoldingRange = exports2.FoldingRange || (exports2.FoldingRange = {}))
			);
			let DiagnosticRelatedInformation;
			(function (DiagnosticRelatedInformation2) {
				function create(location2, message) {
					return {
						location: location2,
						message,
					};
				}
				DiagnosticRelatedInformation2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Location.is(candidate.location) &&
						Is2.string(candidate.message)
					);
				}
				DiagnosticRelatedInformation2.is = is2;
			})(
				(DiagnosticRelatedInformation =
					exports2.DiagnosticRelatedInformation ||
					(exports2.DiagnosticRelatedInformation = {}))
			);
			let DiagnosticSeverity;
			(function (DiagnosticSeverity2) {
				DiagnosticSeverity2.Error = 1;
				DiagnosticSeverity2.Warning = 2;
				DiagnosticSeverity2.Information = 3;
				DiagnosticSeverity2.Hint = 4;
			})(
				(DiagnosticSeverity =
					exports2.DiagnosticSeverity || (exports2.DiagnosticSeverity = {}))
			);
			let DiagnosticTag;
			(function (DiagnosticTag2) {
				DiagnosticTag2.Unnecessary = 1;
				DiagnosticTag2.Deprecated = 2;
			})(
				(DiagnosticTag =
					exports2.DiagnosticTag || (exports2.DiagnosticTag = {}))
			);
			let CodeDescription;
			(function (CodeDescription2) {
				function is2(value) {
					let candidate = value;
					return Is2.objectLiteral(candidate) && Is2.string(candidate.href);
				}
				CodeDescription2.is = is2;
			})(
				(CodeDescription =
					exports2.CodeDescription || (exports2.CodeDescription = {}))
			);
			let Diagnostic;
			(function (Diagnostic2) {
				function create(
					range,
					message,
					severity,
					code,
					source,
					relatedInformation
				) {
					let result = { range, message };
					if (Is2.defined(severity)) {
						result.severity = severity;
					}
					if (Is2.defined(code)) {
						result.code = code;
					}
					if (Is2.defined(source)) {
						result.source = source;
					}
					if (Is2.defined(relatedInformation)) {
						result.relatedInformation = relatedInformation;
					}
					return result;
				}
				Diagnostic2.create = create;
				function is2(value) {
					let _a2;
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Range.is(candidate.range) &&
						Is2.string(candidate.message) &&
						(Is2.number(candidate.severity) ||
							Is2.undefined(candidate.severity)) &&
						(Is2.integer(candidate.code) ||
							Is2.string(candidate.code) ||
							Is2.undefined(candidate.code)) &&
						(Is2.undefined(candidate.codeDescription) ||
							Is2.string(
								(_a2 = candidate.codeDescription) === null || _a2 === void 0
									? void 0
									: _a2.href
							)) &&
						(Is2.string(candidate.source) || Is2.undefined(candidate.source)) &&
						(Is2.undefined(candidate.relatedInformation) ||
							Is2.typedArray(
								candidate.relatedInformation,
								DiagnosticRelatedInformation.is
							))
					);
				}
				Diagnostic2.is = is2;
			})((Diagnostic = exports2.Diagnostic || (exports2.Diagnostic = {})));
			let Command;
			(function (Command2) {
				function create(title, command) {
					let args = [];
					for (let _i2 = 2; _i2 < arguments.length; _i2++) {
						args[_i2 - 2] = arguments[_i2];
					}
					let result = { title, command };
					if (Is2.defined(args) && args.length > 0) {
						result.arguments = args;
					}
					return result;
				}
				Command2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Is2.string(candidate.title) &&
						Is2.string(candidate.command)
					);
				}
				Command2.is = is2;
			})((Command = exports2.Command || (exports2.Command = {})));
			let TextEdit;
			(function (TextEdit2) {
				function replace(range, newText) {
					return { range, newText };
				}
				TextEdit2.replace = replace;
				function insert(position, newText) {
					return { range: { start: position, end: position }, newText };
				}
				TextEdit2.insert = insert;
				function del(range) {
					return { range, newText: '' };
				}
				TextEdit2.del = del;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Is2.string(candidate.newText) &&
						Range.is(candidate.range)
					);
				}
				TextEdit2.is = is2;
			})((TextEdit = exports2.TextEdit || (exports2.TextEdit = {})));
			let ChangeAnnotation;
			(function (ChangeAnnotation2) {
				function create(label, needsConfirmation, description) {
					let result = { label };
					if (needsConfirmation !== void 0) {
						result.needsConfirmation = needsConfirmation;
					}
					if (description !== void 0) {
						result.description = description;
					}
					return result;
				}
				ChangeAnnotation2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Is2.string(candidate.label) &&
						(Is2.boolean(candidate.needsConfirmation) ||
							candidate.needsConfirmation === void 0) &&
						(Is2.string(candidate.description) ||
							candidate.description === void 0)
					);
				}
				ChangeAnnotation2.is = is2;
			})(
				(ChangeAnnotation =
					exports2.ChangeAnnotation || (exports2.ChangeAnnotation = {}))
			);
			let ChangeAnnotationIdentifier;
			(function (ChangeAnnotationIdentifier2) {
				function is2(value) {
					let candidate = value;
					return Is2.string(candidate);
				}
				ChangeAnnotationIdentifier2.is = is2;
			})(
				(ChangeAnnotationIdentifier =
					exports2.ChangeAnnotationIdentifier ||
					(exports2.ChangeAnnotationIdentifier = {}))
			);
			let AnnotatedTextEdit;
			(function (AnnotatedTextEdit2) {
				function replace(range, newText, annotation) {
					return { range, newText, annotationId: annotation };
				}
				AnnotatedTextEdit2.replace = replace;
				function insert(position, newText, annotation) {
					return {
						range: { start: position, end: position },
						newText,
						annotationId: annotation,
					};
				}
				AnnotatedTextEdit2.insert = insert;
				function del(range, annotation) {
					return { range, newText: '', annotationId: annotation };
				}
				AnnotatedTextEdit2.del = del;
				function is2(value) {
					let candidate = value;
					return (
						TextEdit.is(candidate) &&
						(ChangeAnnotation.is(candidate.annotationId) ||
							ChangeAnnotationIdentifier.is(candidate.annotationId))
					);
				}
				AnnotatedTextEdit2.is = is2;
			})(
				(AnnotatedTextEdit =
					exports2.AnnotatedTextEdit || (exports2.AnnotatedTextEdit = {}))
			);
			let TextDocumentEdit;
			(function (TextDocumentEdit2) {
				function create(textDocument, edits) {
					return { textDocument, edits };
				}
				TextDocumentEdit2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						OptionalVersionedTextDocumentIdentifier.is(
							candidate.textDocument
						) &&
						Array.isArray(candidate.edits)
					);
				}
				TextDocumentEdit2.is = is2;
			})(
				(TextDocumentEdit =
					exports2.TextDocumentEdit || (exports2.TextDocumentEdit = {}))
			);
			let CreateFile;
			(function (CreateFile2) {
				function create(uri, options, annotation) {
					let result = {
						kind: 'create',
						uri,
					};
					if (
						options !== void 0 &&
						(options.overwrite !== void 0 || options.ignoreIfExists !== void 0)
					) {
						result.options = options;
					}
					if (annotation !== void 0) {
						result.annotationId = annotation;
					}
					return result;
				}
				CreateFile2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						candidate.kind === 'create' &&
						Is2.string(candidate.uri) &&
						(candidate.options === void 0 ||
							((candidate.options.overwrite === void 0 ||
								Is2.boolean(candidate.options.overwrite)) &&
								(candidate.options.ignoreIfExists === void 0 ||
									Is2.boolean(candidate.options.ignoreIfExists)))) &&
						(candidate.annotationId === void 0 ||
							ChangeAnnotationIdentifier.is(candidate.annotationId))
					);
				}
				CreateFile2.is = is2;
			})((CreateFile = exports2.CreateFile || (exports2.CreateFile = {})));
			let RenameFile;
			(function (RenameFile2) {
				function create(oldUri, newUri, options, annotation) {
					let result = {
						kind: 'rename',
						oldUri,
						newUri,
					};
					if (
						options !== void 0 &&
						(options.overwrite !== void 0 || options.ignoreIfExists !== void 0)
					) {
						result.options = options;
					}
					if (annotation !== void 0) {
						result.annotationId = annotation;
					}
					return result;
				}
				RenameFile2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						candidate.kind === 'rename' &&
						Is2.string(candidate.oldUri) &&
						Is2.string(candidate.newUri) &&
						(candidate.options === void 0 ||
							((candidate.options.overwrite === void 0 ||
								Is2.boolean(candidate.options.overwrite)) &&
								(candidate.options.ignoreIfExists === void 0 ||
									Is2.boolean(candidate.options.ignoreIfExists)))) &&
						(candidate.annotationId === void 0 ||
							ChangeAnnotationIdentifier.is(candidate.annotationId))
					);
				}
				RenameFile2.is = is2;
			})((RenameFile = exports2.RenameFile || (exports2.RenameFile = {})));
			let DeleteFile;
			(function (DeleteFile2) {
				function create(uri, options, annotation) {
					let result = {
						kind: 'delete',
						uri,
					};
					if (
						options !== void 0 &&
						(options.recursive !== void 0 ||
							options.ignoreIfNotExists !== void 0)
					) {
						result.options = options;
					}
					if (annotation !== void 0) {
						result.annotationId = annotation;
					}
					return result;
				}
				DeleteFile2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						candidate.kind === 'delete' &&
						Is2.string(candidate.uri) &&
						(candidate.options === void 0 ||
							((candidate.options.recursive === void 0 ||
								Is2.boolean(candidate.options.recursive)) &&
								(candidate.options.ignoreIfNotExists === void 0 ||
									Is2.boolean(candidate.options.ignoreIfNotExists)))) &&
						(candidate.annotationId === void 0 ||
							ChangeAnnotationIdentifier.is(candidate.annotationId))
					);
				}
				DeleteFile2.is = is2;
			})((DeleteFile = exports2.DeleteFile || (exports2.DeleteFile = {})));
			let WorkspaceEdit;
			(function (WorkspaceEdit2) {
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						(candidate.changes !== void 0 ||
							candidate.documentChanges !== void 0) &&
						(candidate.documentChanges === void 0 ||
							candidate.documentChanges.every(function (change) {
								if (Is2.string(change.kind)) {
									return (
										CreateFile.is(change) ||
										RenameFile.is(change) ||
										DeleteFile.is(change)
									);
								} else {
									return TextDocumentEdit.is(change);
								}
							}))
					);
				}
				WorkspaceEdit2.is = is2;
			})(
				(WorkspaceEdit =
					exports2.WorkspaceEdit || (exports2.WorkspaceEdit = {}))
			);
			let TextEditChangeImpl = (function () {
				function TextEditChangeImpl2(edits, changeAnnotations) {
					this.edits = edits;
					this.changeAnnotations = changeAnnotations;
				}
				TextEditChangeImpl2.prototype.insert = function (
					position,
					newText,
					annotation
				) {
					let edit;
					let id;
					if (annotation === void 0) {
						edit = TextEdit.insert(position, newText);
					} else if (ChangeAnnotationIdentifier.is(annotation)) {
						id = annotation;
						edit = AnnotatedTextEdit.insert(position, newText, annotation);
					} else {
						this.assertChangeAnnotations(this.changeAnnotations);
						id = this.changeAnnotations.manage(annotation);
						edit = AnnotatedTextEdit.insert(position, newText, id);
					}
					this.edits.push(edit);
					if (id !== void 0) {
						return id;
					}
				};
				TextEditChangeImpl2.prototype.replace = function (
					range,
					newText,
					annotation
				) {
					let edit;
					let id;
					if (annotation === void 0) {
						edit = TextEdit.replace(range, newText);
					} else if (ChangeAnnotationIdentifier.is(annotation)) {
						id = annotation;
						edit = AnnotatedTextEdit.replace(range, newText, annotation);
					} else {
						this.assertChangeAnnotations(this.changeAnnotations);
						id = this.changeAnnotations.manage(annotation);
						edit = AnnotatedTextEdit.replace(range, newText, id);
					}
					this.edits.push(edit);
					if (id !== void 0) {
						return id;
					}
				};
				TextEditChangeImpl2.prototype.delete = function (range, annotation) {
					let edit;
					let id;
					if (annotation === void 0) {
						edit = TextEdit.del(range);
					} else if (ChangeAnnotationIdentifier.is(annotation)) {
						id = annotation;
						edit = AnnotatedTextEdit.del(range, annotation);
					} else {
						this.assertChangeAnnotations(this.changeAnnotations);
						id = this.changeAnnotations.manage(annotation);
						edit = AnnotatedTextEdit.del(range, id);
					}
					this.edits.push(edit);
					if (id !== void 0) {
						return id;
					}
				};
				TextEditChangeImpl2.prototype.add = function (edit) {
					this.edits.push(edit);
				};
				TextEditChangeImpl2.prototype.all = function () {
					return this.edits;
				};
				TextEditChangeImpl2.prototype.clear = function () {
					this.edits.splice(0, this.edits.length);
				};
				TextEditChangeImpl2.prototype.assertChangeAnnotations = function (
					value
				) {
					if (value === void 0) {
						throw new Error(
							'Text edit change is not configured to manage change annotations.'
						);
					}
				};
				return TextEditChangeImpl2;
			})();
			let ChangeAnnotations = (function () {
				function ChangeAnnotations2(annotations) {
					this._annotations =
						annotations === void 0 ? Object.create(null) : annotations;
					this._counter = 0;
					this._size = 0;
				}
				ChangeAnnotations2.prototype.all = function () {
					return this._annotations;
				};
				Object.defineProperty(ChangeAnnotations2.prototype, 'size', {
					get: function () {
						return this._size;
					},
					enumerable: false,
					configurable: true,
				});
				ChangeAnnotations2.prototype.manage = function (
					idOrAnnotation,
					annotation
				) {
					let id;
					if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
						id = idOrAnnotation;
					} else {
						id = this.nextId();
						annotation = idOrAnnotation;
					}
					if (this._annotations[id] !== void 0) {
						throw new Error('Id '.concat(id, ' is already in use.'));
					}
					if (annotation === void 0) {
						throw new Error('No annotation provided for id '.concat(id));
					}
					this._annotations[id] = annotation;
					this._size++;
					return id;
				};
				ChangeAnnotations2.prototype.nextId = function () {
					this._counter++;
					return this._counter.toString();
				};
				return ChangeAnnotations2;
			})();
			let WorkspaceChange = (function () {
				function WorkspaceChange2(workspaceEdit) {
					let _this = this;
					this._textEditChanges = Object.create(null);
					if (workspaceEdit !== void 0) {
						this._workspaceEdit = workspaceEdit;
						if (workspaceEdit.documentChanges) {
							this._changeAnnotations = new ChangeAnnotations(
								workspaceEdit.changeAnnotations
							);
							workspaceEdit.changeAnnotations = this._changeAnnotations.all();
							workspaceEdit.documentChanges.forEach(function (change) {
								if (TextDocumentEdit.is(change)) {
									let textEditChange = new TextEditChangeImpl(
										change.edits,
										_this._changeAnnotations
									);
									_this._textEditChanges[
										change.textDocument.uri
									] = textEditChange;
								}
							});
						} else if (workspaceEdit.changes) {
							Object.keys(workspaceEdit.changes).forEach(function (key) {
								let textEditChange = new TextEditChangeImpl(
									workspaceEdit.changes[key]
								);
								_this._textEditChanges[key] = textEditChange;
							});
						}
					} else {
						this._workspaceEdit = {};
					}
				}
				Object.defineProperty(WorkspaceChange2.prototype, 'edit', {
					get: function () {
						this.initDocumentChanges();
						if (this._changeAnnotations !== void 0) {
							if (this._changeAnnotations.size === 0) {
								this._workspaceEdit.changeAnnotations = void 0;
							} else {
								this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
							}
						}
						return this._workspaceEdit;
					},
					enumerable: false,
					configurable: true,
				});
				WorkspaceChange2.prototype.getTextEditChange = function (key) {
					if (OptionalVersionedTextDocumentIdentifier.is(key)) {
						this.initDocumentChanges();
						if (this._workspaceEdit.documentChanges === void 0) {
							throw new Error(
								'Workspace edit is not configured for document changes.'
							);
						}
						let textDocument = { uri: key.uri, version: key.version };
						var result = this._textEditChanges[textDocument.uri];
						if (!result) {
							var edits = [];
							let textDocumentEdit = {
								textDocument,
								edits,
							};
							this._workspaceEdit.documentChanges.push(textDocumentEdit);
							result = new TextEditChangeImpl(edits, this._changeAnnotations);
							this._textEditChanges[textDocument.uri] = result;
						}
						return result;
					} else {
						this.initChanges();
						if (this._workspaceEdit.changes === void 0) {
							throw new Error(
								'Workspace edit is not configured for normal text edit changes.'
							);
						}
						var result = this._textEditChanges[key];
						if (!result) {
							var edits = [];
							this._workspaceEdit.changes[key] = edits;
							result = new TextEditChangeImpl(edits);
							this._textEditChanges[key] = result;
						}
						return result;
					}
				};
				WorkspaceChange2.prototype.initDocumentChanges = function () {
					if (
						this._workspaceEdit.documentChanges === void 0 &&
						this._workspaceEdit.changes === void 0
					) {
						this._changeAnnotations = new ChangeAnnotations();
						this._workspaceEdit.documentChanges = [];
						this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
					}
				};
				WorkspaceChange2.prototype.initChanges = function () {
					if (
						this._workspaceEdit.documentChanges === void 0 &&
						this._workspaceEdit.changes === void 0
					) {
						this._workspaceEdit.changes = Object.create(null);
					}
				};
				WorkspaceChange2.prototype.createFile = function (
					uri,
					optionsOrAnnotation,
					options
				) {
					this.initDocumentChanges();
					if (this._workspaceEdit.documentChanges === void 0) {
						throw new Error(
							'Workspace edit is not configured for document changes.'
						);
					}
					let annotation;
					if (
						ChangeAnnotation.is(optionsOrAnnotation) ||
						ChangeAnnotationIdentifier.is(optionsOrAnnotation)
					) {
						annotation = optionsOrAnnotation;
					} else {
						options = optionsOrAnnotation;
					}
					let operation;
					let id;
					if (annotation === void 0) {
						operation = CreateFile.create(uri, options);
					} else {
						id = ChangeAnnotationIdentifier.is(annotation)
							? annotation
							: this._changeAnnotations.manage(annotation);
						operation = CreateFile.create(uri, options, id);
					}
					this._workspaceEdit.documentChanges.push(operation);
					if (id !== void 0) {
						return id;
					}
				};
				WorkspaceChange2.prototype.renameFile = function (
					oldUri,
					newUri,
					optionsOrAnnotation,
					options
				) {
					this.initDocumentChanges();
					if (this._workspaceEdit.documentChanges === void 0) {
						throw new Error(
							'Workspace edit is not configured for document changes.'
						);
					}
					let annotation;
					if (
						ChangeAnnotation.is(optionsOrAnnotation) ||
						ChangeAnnotationIdentifier.is(optionsOrAnnotation)
					) {
						annotation = optionsOrAnnotation;
					} else {
						options = optionsOrAnnotation;
					}
					let operation;
					let id;
					if (annotation === void 0) {
						operation = RenameFile.create(oldUri, newUri, options);
					} else {
						id = ChangeAnnotationIdentifier.is(annotation)
							? annotation
							: this._changeAnnotations.manage(annotation);
						operation = RenameFile.create(oldUri, newUri, options, id);
					}
					this._workspaceEdit.documentChanges.push(operation);
					if (id !== void 0) {
						return id;
					}
				};
				WorkspaceChange2.prototype.deleteFile = function (
					uri,
					optionsOrAnnotation,
					options
				) {
					this.initDocumentChanges();
					if (this._workspaceEdit.documentChanges === void 0) {
						throw new Error(
							'Workspace edit is not configured for document changes.'
						);
					}
					let annotation;
					if (
						ChangeAnnotation.is(optionsOrAnnotation) ||
						ChangeAnnotationIdentifier.is(optionsOrAnnotation)
					) {
						annotation = optionsOrAnnotation;
					} else {
						options = optionsOrAnnotation;
					}
					let operation;
					let id;
					if (annotation === void 0) {
						operation = DeleteFile.create(uri, options);
					} else {
						id = ChangeAnnotationIdentifier.is(annotation)
							? annotation
							: this._changeAnnotations.manage(annotation);
						operation = DeleteFile.create(uri, options, id);
					}
					this._workspaceEdit.documentChanges.push(operation);
					if (id !== void 0) {
						return id;
					}
				};
				return WorkspaceChange2;
			})();
			exports2.WorkspaceChange = WorkspaceChange;
			let TextDocumentIdentifier;
			(function (TextDocumentIdentifier2) {
				function create(uri) {
					return { uri };
				}
				TextDocumentIdentifier2.create = create;
				function is2(value) {
					let candidate = value;
					return Is2.defined(candidate) && Is2.string(candidate.uri);
				}
				TextDocumentIdentifier2.is = is2;
			})(
				(TextDocumentIdentifier =
					exports2.TextDocumentIdentifier ||
					(exports2.TextDocumentIdentifier = {}))
			);
			let VersionedTextDocumentIdentifier;
			(function (VersionedTextDocumentIdentifier2) {
				function create(uri, version) {
					return { uri, version };
				}
				VersionedTextDocumentIdentifier2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Is2.string(candidate.uri) &&
						Is2.integer(candidate.version)
					);
				}
				VersionedTextDocumentIdentifier2.is = is2;
			})(
				(VersionedTextDocumentIdentifier =
					exports2.VersionedTextDocumentIdentifier ||
					(exports2.VersionedTextDocumentIdentifier = {}))
			);
			let OptionalVersionedTextDocumentIdentifier;
			(function (OptionalVersionedTextDocumentIdentifier2) {
				function create(uri, version) {
					return { uri, version };
				}
				OptionalVersionedTextDocumentIdentifier2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Is2.string(candidate.uri) &&
						(candidate.version === null || Is2.integer(candidate.version))
					);
				}
				OptionalVersionedTextDocumentIdentifier2.is = is2;
			})(
				(OptionalVersionedTextDocumentIdentifier =
					exports2.OptionalVersionedTextDocumentIdentifier ||
					(exports2.OptionalVersionedTextDocumentIdentifier = {}))
			);
			let TextDocumentItem;
			(function (TextDocumentItem2) {
				function create(uri, languageId, version, text) {
					return { uri, languageId, version, text };
				}
				TextDocumentItem2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Is2.string(candidate.uri) &&
						Is2.string(candidate.languageId) &&
						Is2.integer(candidate.version) &&
						Is2.string(candidate.text)
					);
				}
				TextDocumentItem2.is = is2;
			})(
				(TextDocumentItem =
					exports2.TextDocumentItem || (exports2.TextDocumentItem = {}))
			);
			let MarkupKind;
			(function (MarkupKind2) {
				MarkupKind2.PlainText = 'plaintext';
				MarkupKind2.Markdown = 'markdown';
			})((MarkupKind = exports2.MarkupKind || (exports2.MarkupKind = {})));
			(function (MarkupKind2) {
				function is2(value) {
					let candidate = value;
					return (
						candidate === MarkupKind2.PlainText ||
						candidate === MarkupKind2.Markdown
					);
				}
				MarkupKind2.is = is2;
			})((MarkupKind = exports2.MarkupKind || (exports2.MarkupKind = {})));
			let MarkupContent;
			(function (MarkupContent2) {
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(value) &&
						MarkupKind.is(candidate.kind) &&
						Is2.string(candidate.value)
					);
				}
				MarkupContent2.is = is2;
			})(
				(MarkupContent =
					exports2.MarkupContent || (exports2.MarkupContent = {}))
			);
			let CompletionItemKind;
			(function (CompletionItemKind2) {
				CompletionItemKind2.Text = 1;
				CompletionItemKind2.Method = 2;
				CompletionItemKind2.Function = 3;
				CompletionItemKind2.Constructor = 4;
				CompletionItemKind2.Field = 5;
				CompletionItemKind2.Variable = 6;
				CompletionItemKind2.Class = 7;
				CompletionItemKind2.Interface = 8;
				CompletionItemKind2.Module = 9;
				CompletionItemKind2.Property = 10;
				CompletionItemKind2.Unit = 11;
				CompletionItemKind2.Value = 12;
				CompletionItemKind2.Enum = 13;
				CompletionItemKind2.Keyword = 14;
				CompletionItemKind2.Snippet = 15;
				CompletionItemKind2.Color = 16;
				CompletionItemKind2.File = 17;
				CompletionItemKind2.Reference = 18;
				CompletionItemKind2.Folder = 19;
				CompletionItemKind2.EnumMember = 20;
				CompletionItemKind2.Constant = 21;
				CompletionItemKind2.Struct = 22;
				CompletionItemKind2.Event = 23;
				CompletionItemKind2.Operator = 24;
				CompletionItemKind2.TypeParameter = 25;
			})(
				(CompletionItemKind =
					exports2.CompletionItemKind || (exports2.CompletionItemKind = {}))
			);
			let InsertTextFormat;
			(function (InsertTextFormat2) {
				InsertTextFormat2.PlainText = 1;
				InsertTextFormat2.Snippet = 2;
			})(
				(InsertTextFormat =
					exports2.InsertTextFormat || (exports2.InsertTextFormat = {}))
			);
			let CompletionItemTag;
			(function (CompletionItemTag2) {
				CompletionItemTag2.Deprecated = 1;
			})(
				(CompletionItemTag =
					exports2.CompletionItemTag || (exports2.CompletionItemTag = {}))
			);
			let InsertReplaceEdit;
			(function (InsertReplaceEdit2) {
				function create(newText, insert, replace) {
					return { newText, insert, replace };
				}
				InsertReplaceEdit2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						Is2.string(candidate.newText) &&
						Range.is(candidate.insert) &&
						Range.is(candidate.replace)
					);
				}
				InsertReplaceEdit2.is = is2;
			})(
				(InsertReplaceEdit =
					exports2.InsertReplaceEdit || (exports2.InsertReplaceEdit = {}))
			);
			let InsertTextMode;
			(function (InsertTextMode2) {
				InsertTextMode2.asIs = 1;
				InsertTextMode2.adjustIndentation = 2;
			})(
				(InsertTextMode =
					exports2.InsertTextMode || (exports2.InsertTextMode = {}))
			);
			let CompletionItemLabelDetails;
			(function (CompletionItemLabelDetails2) {
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						(Is2.string(candidate.detail) || candidate.detail === void 0) &&
						(Is2.string(candidate.description) ||
							candidate.description === void 0)
					);
				}
				CompletionItemLabelDetails2.is = is2;
			})(
				(CompletionItemLabelDetails =
					exports2.CompletionItemLabelDetails ||
					(exports2.CompletionItemLabelDetails = {}))
			);
			let CompletionItem;
			(function (CompletionItem2) {
				function create(label) {
					return { label };
				}
				CompletionItem2.create = create;
			})(
				(CompletionItem =
					exports2.CompletionItem || (exports2.CompletionItem = {}))
			);
			let CompletionList;
			(function (CompletionList2) {
				function create(items, isIncomplete) {
					return { items: items ? items : [], isIncomplete: !!isIncomplete };
				}
				CompletionList2.create = create;
			})(
				(CompletionList =
					exports2.CompletionList || (exports2.CompletionList = {}))
			);
			let MarkedString;
			(function (MarkedString2) {
				function fromPlainText(plainText) {
					return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
				}
				MarkedString2.fromPlainText = fromPlainText;
				function is2(value) {
					let candidate = value;
					return (
						Is2.string(candidate) ||
						(Is2.objectLiteral(candidate) &&
							Is2.string(candidate.language) &&
							Is2.string(candidate.value))
					);
				}
				MarkedString2.is = is2;
			})(
				(MarkedString = exports2.MarkedString || (exports2.MarkedString = {}))
			);
			let Hover;
			(function (Hover2) {
				function is2(value) {
					let candidate = value;
					return (
						!!candidate &&
						Is2.objectLiteral(candidate) &&
						(MarkupContent.is(candidate.contents) ||
							MarkedString.is(candidate.contents) ||
							Is2.typedArray(candidate.contents, MarkedString.is)) &&
						(value.range === void 0 || Range.is(value.range))
					);
				}
				Hover2.is = is2;
			})((Hover = exports2.Hover || (exports2.Hover = {})));
			let ParameterInformation;
			(function (ParameterInformation2) {
				function create(label, documentation) {
					return documentation ? { label, documentation } : { label };
				}
				ParameterInformation2.create = create;
			})(
				(ParameterInformation =
					exports2.ParameterInformation || (exports2.ParameterInformation = {}))
			);
			let SignatureInformation;
			(function (SignatureInformation2) {
				function create(label, documentation) {
					let parameters = [];
					for (let _i2 = 2; _i2 < arguments.length; _i2++) {
						parameters[_i2 - 2] = arguments[_i2];
					}
					let result = { label };
					if (Is2.defined(documentation)) {
						result.documentation = documentation;
					}
					if (Is2.defined(parameters)) {
						result.parameters = parameters;
					} else {
						result.parameters = [];
					}
					return result;
				}
				SignatureInformation2.create = create;
			})(
				(SignatureInformation =
					exports2.SignatureInformation || (exports2.SignatureInformation = {}))
			);
			let DocumentHighlightKind;
			(function (DocumentHighlightKind2) {
				DocumentHighlightKind2.Text = 1;
				DocumentHighlightKind2.Read = 2;
				DocumentHighlightKind2.Write = 3;
			})(
				(DocumentHighlightKind =
					exports2.DocumentHighlightKind ||
					(exports2.DocumentHighlightKind = {}))
			);
			let DocumentHighlight;
			(function (DocumentHighlight2) {
				function create(range, kind) {
					let result = { range };
					if (Is2.number(kind)) {
						result.kind = kind;
					}
					return result;
				}
				DocumentHighlight2.create = create;
			})(
				(DocumentHighlight =
					exports2.DocumentHighlight || (exports2.DocumentHighlight = {}))
			);
			let SymbolKind;
			(function (SymbolKind2) {
				SymbolKind2.File = 1;
				SymbolKind2.Module = 2;
				SymbolKind2.Namespace = 3;
				SymbolKind2.Package = 4;
				SymbolKind2.Class = 5;
				SymbolKind2.Method = 6;
				SymbolKind2.Property = 7;
				SymbolKind2.Field = 8;
				SymbolKind2.Constructor = 9;
				SymbolKind2.Enum = 10;
				SymbolKind2.Interface = 11;
				SymbolKind2.Function = 12;
				SymbolKind2.Variable = 13;
				SymbolKind2.Constant = 14;
				SymbolKind2.String = 15;
				SymbolKind2.Number = 16;
				SymbolKind2.Boolean = 17;
				SymbolKind2.Array = 18;
				SymbolKind2.Object = 19;
				SymbolKind2.Key = 20;
				SymbolKind2.Null = 21;
				SymbolKind2.EnumMember = 22;
				SymbolKind2.Struct = 23;
				SymbolKind2.Event = 24;
				SymbolKind2.Operator = 25;
				SymbolKind2.TypeParameter = 26;
			})((SymbolKind = exports2.SymbolKind || (exports2.SymbolKind = {})));
			let SymbolTag;
			(function (SymbolTag2) {
				SymbolTag2.Deprecated = 1;
			})((SymbolTag = exports2.SymbolTag || (exports2.SymbolTag = {})));
			let SymbolInformation;
			(function (SymbolInformation2) {
				function create(name, kind, range, uri, containerName) {
					let result = {
						name,
						kind,
						location: { uri, range },
					};
					if (containerName) {
						result.containerName = containerName;
					}
					return result;
				}
				SymbolInformation2.create = create;
			})(
				(SymbolInformation =
					exports2.SymbolInformation || (exports2.SymbolInformation = {}))
			);
			let WorkspaceSymbol;
			(function (WorkspaceSymbol2) {
				function create(name, kind, uri, range) {
					return range !== void 0
						? { name, kind, location: { uri, range } }
						: { name, kind, location: { uri } };
				}
				WorkspaceSymbol2.create = create;
			})(
				(WorkspaceSymbol =
					exports2.WorkspaceSymbol || (exports2.WorkspaceSymbol = {}))
			);
			let DocumentSymbol;
			(function (DocumentSymbol2) {
				function create(name, detail, kind, range, selectionRange, children) {
					let result = {
						name,
						detail,
						kind,
						range,
						selectionRange,
					};
					if (children !== void 0) {
						result.children = children;
					}
					return result;
				}
				DocumentSymbol2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						Is2.string(candidate.name) &&
						Is2.number(candidate.kind) &&
						Range.is(candidate.range) &&
						Range.is(candidate.selectionRange) &&
						(candidate.detail === void 0 || Is2.string(candidate.detail)) &&
						(candidate.deprecated === void 0 ||
							Is2.boolean(candidate.deprecated)) &&
						(candidate.children === void 0 ||
							Array.isArray(candidate.children)) &&
						(candidate.tags === void 0 || Array.isArray(candidate.tags))
					);
				}
				DocumentSymbol2.is = is2;
			})(
				(DocumentSymbol =
					exports2.DocumentSymbol || (exports2.DocumentSymbol = {}))
			);
			let CodeActionKind;
			(function (CodeActionKind2) {
				CodeActionKind2.Empty = '';
				CodeActionKind2.QuickFix = 'quickfix';
				CodeActionKind2.Refactor = 'refactor';
				CodeActionKind2.RefactorExtract = 'refactor.extract';
				CodeActionKind2.RefactorInline = 'refactor.inline';
				CodeActionKind2.RefactorRewrite = 'refactor.rewrite';
				CodeActionKind2.Source = 'source';
				CodeActionKind2.SourceOrganizeImports = 'source.organizeImports';
				CodeActionKind2.SourceFixAll = 'source.fixAll';
			})(
				(CodeActionKind =
					exports2.CodeActionKind || (exports2.CodeActionKind = {}))
			);
			let CodeActionTriggerKind;
			(function (CodeActionTriggerKind2) {
				CodeActionTriggerKind2.Invoked = 1;
				CodeActionTriggerKind2.Automatic = 2;
			})(
				(CodeActionTriggerKind =
					exports2.CodeActionTriggerKind ||
					(exports2.CodeActionTriggerKind = {}))
			);
			let CodeActionContext;
			(function (CodeActionContext2) {
				function create(diagnostics, only, triggerKind) {
					let result = { diagnostics };
					if (only !== void 0 && only !== null) {
						result.only = only;
					}
					if (triggerKind !== void 0 && triggerKind !== null) {
						result.triggerKind = triggerKind;
					}
					return result;
				}
				CodeActionContext2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Is2.typedArray(candidate.diagnostics, Diagnostic.is) &&
						(candidate.only === void 0 ||
							Is2.typedArray(candidate.only, Is2.string)) &&
						(candidate.triggerKind === void 0 ||
							candidate.triggerKind === CodeActionTriggerKind.Invoked ||
							candidate.triggerKind === CodeActionTriggerKind.Automatic)
					);
				}
				CodeActionContext2.is = is2;
			})(
				(CodeActionContext =
					exports2.CodeActionContext || (exports2.CodeActionContext = {}))
			);
			let CodeAction;
			(function (CodeAction2) {
				function create(title, kindOrCommandOrEdit, kind) {
					let result = { title };
					let checkKind = true;
					if (typeof kindOrCommandOrEdit === 'string') {
						checkKind = false;
						result.kind = kindOrCommandOrEdit;
					} else if (Command.is(kindOrCommandOrEdit)) {
						result.command = kindOrCommandOrEdit;
					} else {
						result.edit = kindOrCommandOrEdit;
					}
					if (checkKind && kind !== void 0) {
						result.kind = kind;
					}
					return result;
				}
				CodeAction2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate &&
						Is2.string(candidate.title) &&
						(candidate.diagnostics === void 0 ||
							Is2.typedArray(candidate.diagnostics, Diagnostic.is)) &&
						(candidate.kind === void 0 || Is2.string(candidate.kind)) &&
						(candidate.edit !== void 0 || candidate.command !== void 0) &&
						(candidate.command === void 0 || Command.is(candidate.command)) &&
						(candidate.isPreferred === void 0 ||
							Is2.boolean(candidate.isPreferred)) &&
						(candidate.edit === void 0 || WorkspaceEdit.is(candidate.edit))
					);
				}
				CodeAction2.is = is2;
			})((CodeAction = exports2.CodeAction || (exports2.CodeAction = {})));
			let CodeLens;
			(function (CodeLens2) {
				function create(range, data) {
					let result = { range };
					if (Is2.defined(data)) {
						result.data = data;
					}
					return result;
				}
				CodeLens2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Range.is(candidate.range) &&
						(Is2.undefined(candidate.command) || Command.is(candidate.command))
					);
				}
				CodeLens2.is = is2;
			})((CodeLens = exports2.CodeLens || (exports2.CodeLens = {})));
			let FormattingOptions;
			(function (FormattingOptions2) {
				function create(tabSize, insertSpaces) {
					return { tabSize, insertSpaces };
				}
				FormattingOptions2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Is2.uinteger(candidate.tabSize) &&
						Is2.boolean(candidate.insertSpaces)
					);
				}
				FormattingOptions2.is = is2;
			})(
				(FormattingOptions =
					exports2.FormattingOptions || (exports2.FormattingOptions = {}))
			);
			let DocumentLink;
			(function (DocumentLink2) {
				function create(range, target, data) {
					return { range, target, data };
				}
				DocumentLink2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.defined(candidate) &&
						Range.is(candidate.range) &&
						(Is2.undefined(candidate.target) || Is2.string(candidate.target))
					);
				}
				DocumentLink2.is = is2;
			})(
				(DocumentLink = exports2.DocumentLink || (exports2.DocumentLink = {}))
			);
			let SelectionRange;
			(function (SelectionRange2) {
				function create(range, parent) {
					return { range, parent };
				}
				SelectionRange2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						Range.is(candidate.range) &&
						(candidate.parent === void 0 ||
							SelectionRange2.is(candidate.parent))
					);
				}
				SelectionRange2.is = is2;
			})(
				(SelectionRange =
					exports2.SelectionRange || (exports2.SelectionRange = {}))
			);
			let SemanticTokenTypes;
			(function (SemanticTokenTypes2) {
				SemanticTokenTypes2['namespace'] = 'namespace';
				SemanticTokenTypes2['type'] = 'type';
				SemanticTokenTypes2['class'] = 'class';
				SemanticTokenTypes2['enum'] = 'enum';
				SemanticTokenTypes2['interface'] = 'interface';
				SemanticTokenTypes2['struct'] = 'struct';
				SemanticTokenTypes2['typeParameter'] = 'typeParameter';
				SemanticTokenTypes2['parameter'] = 'parameter';
				SemanticTokenTypes2['variable'] = 'variable';
				SemanticTokenTypes2['property'] = 'property';
				SemanticTokenTypes2['enumMember'] = 'enumMember';
				SemanticTokenTypes2['event'] = 'event';
				SemanticTokenTypes2['function'] = 'function';
				SemanticTokenTypes2['method'] = 'method';
				SemanticTokenTypes2['macro'] = 'macro';
				SemanticTokenTypes2['keyword'] = 'keyword';
				SemanticTokenTypes2['modifier'] = 'modifier';
				SemanticTokenTypes2['comment'] = 'comment';
				SemanticTokenTypes2['string'] = 'string';
				SemanticTokenTypes2['number'] = 'number';
				SemanticTokenTypes2['regexp'] = 'regexp';
				SemanticTokenTypes2['operator'] = 'operator';
				SemanticTokenTypes2['decorator'] = 'decorator';
			})(
				(SemanticTokenTypes =
					exports2.SemanticTokenTypes || (exports2.SemanticTokenTypes = {}))
			);
			let SemanticTokenModifiers;
			(function (SemanticTokenModifiers2) {
				SemanticTokenModifiers2['declaration'] = 'declaration';
				SemanticTokenModifiers2['definition'] = 'definition';
				SemanticTokenModifiers2['readonly'] = 'readonly';
				SemanticTokenModifiers2['static'] = 'static';
				SemanticTokenModifiers2['deprecated'] = 'deprecated';
				SemanticTokenModifiers2['abstract'] = 'abstract';
				SemanticTokenModifiers2['async'] = 'async';
				SemanticTokenModifiers2['modification'] = 'modification';
				SemanticTokenModifiers2['documentation'] = 'documentation';
				SemanticTokenModifiers2['defaultLibrary'] = 'defaultLibrary';
			})(
				(SemanticTokenModifiers =
					exports2.SemanticTokenModifiers ||
					(exports2.SemanticTokenModifiers = {}))
			);
			let SemanticTokens;
			(function (SemanticTokens2) {
				function is2(value) {
					let candidate = value;
					return (
						Is2.objectLiteral(candidate) &&
						(candidate.resultId === void 0 ||
							typeof candidate.resultId === 'string') &&
						Array.isArray(candidate.data) &&
						(candidate.data.length === 0 ||
							typeof candidate.data[0] === 'number')
					);
				}
				SemanticTokens2.is = is2;
			})(
				(SemanticTokens =
					exports2.SemanticTokens || (exports2.SemanticTokens = {}))
			);
			let InlineValueText;
			(function (InlineValueText2) {
				function create(range, text) {
					return { range, text };
				}
				InlineValueText2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate !== void 0 &&
						candidate !== null &&
						Range.is(candidate.range) &&
						Is2.string(candidate.text)
					);
				}
				InlineValueText2.is = is2;
			})(
				(InlineValueText =
					exports2.InlineValueText || (exports2.InlineValueText = {}))
			);
			let InlineValueVariableLookup;
			(function (InlineValueVariableLookup2) {
				function create(range, variableName, caseSensitiveLookup) {
					return { range, variableName, caseSensitiveLookup };
				}
				InlineValueVariableLookup2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate !== void 0 &&
						candidate !== null &&
						Range.is(candidate.range) &&
						Is2.boolean(candidate.caseSensitiveLookup) &&
						(Is2.string(candidate.variableName) ||
							candidate.variableName === void 0)
					);
				}
				InlineValueVariableLookup2.is = is2;
			})(
				(InlineValueVariableLookup =
					exports2.InlineValueVariableLookup ||
					(exports2.InlineValueVariableLookup = {}))
			);
			let InlineValueEvaluatableExpression;
			(function (InlineValueEvaluatableExpression2) {
				function create(range, expression) {
					return { range, expression };
				}
				InlineValueEvaluatableExpression2.create = create;
				function is2(value) {
					let candidate = value;
					return (
						candidate !== void 0 &&
						candidate !== null &&
						Range.is(candidate.range) &&
						(Is2.string(candidate.expression) ||
							candidate.expression === void 0)
					);
				}
				InlineValueEvaluatableExpression2.is = is2;
			})(
				(InlineValueEvaluatableExpression =
					exports2.InlineValueEvaluatableExpression ||
					(exports2.InlineValueEvaluatableExpression = {}))
			);
			let InlineValuesContext;
			(function (InlineValuesContext2) {
				function create(stoppedLocation) {
					return { stoppedLocation };
				}
				InlineValuesContext2.create = create;
				function is2(value) {
					let candidate = value;
					return Is2.defined(candidate) && Range.is(value.stoppedLocation);
				}
				InlineValuesContext2.is = is2;
			})(
				(InlineValuesContext =
					exports2.InlineValuesContext || (exports2.InlineValuesContext = {}))
			);
			exports2.EOL = ['\n', '\r\n', '\r'];
			let TextDocument;
			(function (TextDocument2) {
				function create(uri, languageId, version, content) {
					return new FullTextDocument(uri, languageId, version, content);
				}
				TextDocument2.create = create;
				function is2(value) {
					let candidate = value;
					return Is2.defined(candidate) &&
						Is2.string(candidate.uri) &&
						(Is2.undefined(candidate.languageId) ||
							Is2.string(candidate.languageId)) &&
						Is2.uinteger(candidate.lineCount) &&
						Is2.func(candidate.getText) &&
						Is2.func(candidate.positionAt) &&
						Is2.func(candidate.offsetAt)
						? true
						: false;
				}
				TextDocument2.is = is2;
				function applyEdits(document2, edits) {
					let text = document2.getText();
					let sortedEdits = mergeSort(edits, function (a, b) {
						let diff = a.range.start.line - b.range.start.line;
						if (diff === 0) {
							return a.range.start.character - b.range.start.character;
						}
						return diff;
					});
					let lastModifiedOffset = text.length;
					for (let i = sortedEdits.length - 1; i >= 0; i--) {
						let e = sortedEdits[i];
						let startOffset = document2.offsetAt(e.range.start);
						let endOffset = document2.offsetAt(e.range.end);
						if (endOffset <= lastModifiedOffset) {
							text =
								text.substring(0, startOffset) +
								e.newText +
								text.substring(endOffset, text.length);
						} else {
							throw new Error('Overlapping edit');
						}
						lastModifiedOffset = startOffset;
					}
					return text;
				}
				TextDocument2.applyEdits = applyEdits;
				function mergeSort(data, compare) {
					if (data.length <= 1) {
						return data;
					}
					let p = (data.length / 2) | 0;
					let left = data.slice(0, p);
					let right = data.slice(p);
					mergeSort(left, compare);
					mergeSort(right, compare);
					let leftIdx = 0;
					let rightIdx = 0;
					let i = 0;
					while (leftIdx < left.length && rightIdx < right.length) {
						let ret = compare(left[leftIdx], right[rightIdx]);
						if (ret <= 0) {
							data[i++] = left[leftIdx++];
						} else {
							data[i++] = right[rightIdx++];
						}
					}
					while (leftIdx < left.length) {
						data[i++] = left[leftIdx++];
					}
					while (rightIdx < right.length) {
						data[i++] = right[rightIdx++];
					}
					return data;
				}
			})(
				(TextDocument = exports2.TextDocument || (exports2.TextDocument = {}))
			);
			var FullTextDocument = (function () {
				function FullTextDocument2(uri, languageId, version, content) {
					this._uri = uri;
					this._languageId = languageId;
					this._version = version;
					this._content = content;
					this._lineOffsets = void 0;
				}
				Object.defineProperty(FullTextDocument2.prototype, 'uri', {
					get: function () {
						return this._uri;
					},
					enumerable: false,
					configurable: true,
				});
				Object.defineProperty(FullTextDocument2.prototype, 'languageId', {
					get: function () {
						return this._languageId;
					},
					enumerable: false,
					configurable: true,
				});
				Object.defineProperty(FullTextDocument2.prototype, 'version', {
					get: function () {
						return this._version;
					},
					enumerable: false,
					configurable: true,
				});
				FullTextDocument2.prototype.getText = function (range) {
					if (range) {
						let start = this.offsetAt(range.start);
						let end = this.offsetAt(range.end);
						return this._content.substring(start, end);
					}
					return this._content;
				};
				FullTextDocument2.prototype.update = function (event, version) {
					this._content = event.text;
					this._version = version;
					this._lineOffsets = void 0;
				};
				FullTextDocument2.prototype.getLineOffsets = function () {
					if (this._lineOffsets === void 0) {
						let lineOffsets = [];
						let text = this._content;
						let isLineStart = true;
						for (let i = 0; i < text.length; i++) {
							if (isLineStart) {
								lineOffsets.push(i);
								isLineStart = false;
							}
							let ch = text.charAt(i);
							isLineStart = ch === '\r' || ch === '\n';
							if (
								ch === '\r' &&
								i + 1 < text.length &&
								text.charAt(i + 1) === '\n'
							) {
								i++;
							}
						}
						if (isLineStart && text.length > 0) {
							lineOffsets.push(text.length);
						}
						this._lineOffsets = lineOffsets;
					}
					return this._lineOffsets;
				};
				FullTextDocument2.prototype.positionAt = function (offset) {
					offset = Math.max(Math.min(offset, this._content.length), 0);
					let lineOffsets = this.getLineOffsets();
					let low = 0,
						high = lineOffsets.length;
					if (high === 0) {
						return Position.create(0, offset);
					}
					while (low < high) {
						let mid = Math.floor((low + high) / 2);
						if (lineOffsets[mid] > offset) {
							high = mid;
						} else {
							low = mid + 1;
						}
					}
					let line = low - 1;
					return Position.create(line, offset - lineOffsets[line]);
				};
				FullTextDocument2.prototype.offsetAt = function (position) {
					let lineOffsets = this.getLineOffsets();
					if (position.line >= lineOffsets.length) {
						return this._content.length;
					} else if (position.line < 0) {
						return 0;
					}
					let lineOffset = lineOffsets[position.line];
					let nextLineOffset =
						position.line + 1 < lineOffsets.length
							? lineOffsets[position.line + 1]
							: this._content.length;
					return Math.max(
						Math.min(lineOffset + position.character, nextLineOffset),
						lineOffset
					);
				};
				Object.defineProperty(FullTextDocument2.prototype, 'lineCount', {
					get: function () {
						return this.getLineOffsets().length;
					},
					enumerable: false,
					configurable: true,
				});
				return FullTextDocument2;
			})();
			let Is2;
			(function (Is3) {
				let toString = Object.prototype.toString;
				function defined(value) {
					return typeof value !== 'undefined';
				}
				Is3.defined = defined;
				function undefined2(value) {
					return typeof value === 'undefined';
				}
				Is3.undefined = undefined2;
				function boolean(value) {
					return value === true || value === false;
				}
				Is3.boolean = boolean;
				function string(value) {
					return toString.call(value) === '[object String]';
				}
				Is3.string = string;
				function number(value) {
					return toString.call(value) === '[object Number]';
				}
				Is3.number = number;
				function numberRange(value, min, max) {
					return (
						toString.call(value) === '[object Number]' &&
						min <= value &&
						value <= max
					);
				}
				Is3.numberRange = numberRange;
				function integer2(value) {
					return (
						toString.call(value) === '[object Number]' &&
						-2147483648 <= value &&
						value <= 2147483647
					);
				}
				Is3.integer = integer2;
				function uinteger2(value) {
					return (
						toString.call(value) === '[object Number]' &&
						0 <= value &&
						value <= 2147483647
					);
				}
				Is3.uinteger = uinteger2;
				function func(value) {
					return toString.call(value) === '[object Function]';
				}
				Is3.func = func;
				function objectLiteral(value) {
					return value !== null && typeof value === 'object';
				}
				Is3.objectLiteral = objectLiteral;
				function typedArray(value, check) {
					return Array.isArray(value) && value.every(check);
				}
				Is3.typedArray = typedArray;
			})(Is2 || (Is2 = {}));
		});
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/messages.js
let require_messages2 = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/messages.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ProtocolNotificationType = exports.ProtocolNotificationType0 = exports.ProtocolRequestType = exports.ProtocolRequestType0 = exports.RegistrationType = void 0;
		let vscode_jsonrpc_1 = require_main();
		let RegistrationType = class {
			constructor(method) {
				this.method = method;
			}
		};
		exports.RegistrationType = RegistrationType;
		let ProtocolRequestType0 = class extends vscode_jsonrpc_1.RequestType0 {
			constructor(method) {
				super(method);
			}
		};
		exports.ProtocolRequestType0 = ProtocolRequestType0;
		let ProtocolRequestType = class extends vscode_jsonrpc_1.RequestType {
			constructor(method) {
				super(method, vscode_jsonrpc_1.ParameterStructures.byName);
			}
		};
		exports.ProtocolRequestType = ProtocolRequestType;
		let ProtocolNotificationType0 = class extends vscode_jsonrpc_1.NotificationType0 {
			constructor(method) {
				super(method);
			}
		};
		exports.ProtocolNotificationType0 = ProtocolNotificationType0;
		let ProtocolNotificationType = class extends vscode_jsonrpc_1.NotificationType {
			constructor(method) {
				super(method, vscode_jsonrpc_1.ParameterStructures.byName);
			}
		};
		exports.ProtocolNotificationType = ProtocolNotificationType;
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/utils/is.js
let require_is2 = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/utils/is.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.objectLiteral = exports.typedArray = exports.stringArray = exports.array = exports.func = exports.error = exports.number = exports.string = exports.boolean = void 0;
		function boolean(value) {
			return value === true || value === false;
		}
		exports.boolean = boolean;
		function string(value) {
			return typeof value === 'string' || value instanceof String;
		}
		exports.string = string;
		function number(value) {
			return typeof value === 'number' || value instanceof Number;
		}
		exports.number = number;
		function error(value) {
			return value instanceof Error;
		}
		exports.error = error;
		function func(value) {
			return typeof value === 'function';
		}
		exports.func = func;
		function array(value) {
			return Array.isArray(value);
		}
		exports.array = array;
		function stringArray(value) {
			return array(value) && value.every((elem) => string(elem));
		}
		exports.stringArray = stringArray;
		function typedArray(value, check) {
			return Array.isArray(value) && value.every(check);
		}
		exports.typedArray = typedArray;
		function objectLiteral(value) {
			return value !== null && typeof value === 'object';
		}
		exports.objectLiteral = objectLiteral;
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.implementation.js
let require_protocol_implementation = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.implementation.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ImplementationRequest = void 0;
		let messages_1 = require_messages2();
		let ImplementationRequest;
		(function (ImplementationRequest2) {
			ImplementationRequest2.method = 'textDocument/implementation';
			ImplementationRequest2.type = new messages_1.ProtocolRequestType(
				ImplementationRequest2.method
			);
		})(
			(ImplementationRequest =
				exports.ImplementationRequest || (exports.ImplementationRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeDefinition.js
let require_protocol_typeDefinition = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeDefinition.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.TypeDefinitionRequest = void 0;
		let messages_1 = require_messages2();
		let TypeDefinitionRequest;
		(function (TypeDefinitionRequest2) {
			TypeDefinitionRequest2.method = 'textDocument/typeDefinition';
			TypeDefinitionRequest2.type = new messages_1.ProtocolRequestType(
				TypeDefinitionRequest2.method
			);
		})(
			(TypeDefinitionRequest =
				exports.TypeDefinitionRequest || (exports.TypeDefinitionRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.workspaceFolders.js
let require_protocol_workspaceFolders = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.workspaceFolders.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.DidChangeWorkspaceFoldersNotification = exports.WorkspaceFoldersRequest = void 0;
		let messages_1 = require_messages2();
		let WorkspaceFoldersRequest;
		(function (WorkspaceFoldersRequest2) {
			WorkspaceFoldersRequest2.type = new messages_1.ProtocolRequestType0(
				'workspace/workspaceFolders'
			);
		})(
			(WorkspaceFoldersRequest =
				exports.WorkspaceFoldersRequest ||
				(exports.WorkspaceFoldersRequest = {}))
		);
		let DidChangeWorkspaceFoldersNotification;
		(function (DidChangeWorkspaceFoldersNotification2) {
			DidChangeWorkspaceFoldersNotification2.type = new messages_1.ProtocolNotificationType(
				'workspace/didChangeWorkspaceFolders'
			);
		})(
			(DidChangeWorkspaceFoldersNotification =
				exports.DidChangeWorkspaceFoldersNotification ||
				(exports.DidChangeWorkspaceFoldersNotification = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.configuration.js
let require_protocol_configuration = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.configuration.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ConfigurationRequest = void 0;
		let messages_1 = require_messages2();
		let ConfigurationRequest;
		(function (ConfigurationRequest2) {
			ConfigurationRequest2.type = new messages_1.ProtocolRequestType(
				'workspace/configuration'
			);
		})(
			(ConfigurationRequest =
				exports.ConfigurationRequest || (exports.ConfigurationRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.colorProvider.js
let require_protocol_colorProvider = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.colorProvider.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ColorPresentationRequest = exports.DocumentColorRequest = void 0;
		let messages_1 = require_messages2();
		let DocumentColorRequest;
		(function (DocumentColorRequest2) {
			DocumentColorRequest2.method = 'textDocument/documentColor';
			DocumentColorRequest2.type = new messages_1.ProtocolRequestType(
				DocumentColorRequest2.method
			);
		})(
			(DocumentColorRequest =
				exports.DocumentColorRequest || (exports.DocumentColorRequest = {}))
		);
		let ColorPresentationRequest;
		(function (ColorPresentationRequest2) {
			ColorPresentationRequest2.type = new messages_1.ProtocolRequestType(
				'textDocument/colorPresentation'
			);
		})(
			(ColorPresentationRequest =
				exports.ColorPresentationRequest ||
				(exports.ColorPresentationRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.foldingRange.js
let require_protocol_foldingRange = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.foldingRange.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.FoldingRangeRequest = exports.FoldingRangeKind = void 0;
		let messages_1 = require_messages2();
		let FoldingRangeKind;
		(function (FoldingRangeKind2) {
			FoldingRangeKind2['Comment'] = 'comment';
			FoldingRangeKind2['Imports'] = 'imports';
			FoldingRangeKind2['Region'] = 'region';
		})(
			(FoldingRangeKind =
				exports.FoldingRangeKind || (exports.FoldingRangeKind = {}))
		);
		let FoldingRangeRequest;
		(function (FoldingRangeRequest2) {
			FoldingRangeRequest2.method = 'textDocument/foldingRange';
			FoldingRangeRequest2.type = new messages_1.ProtocolRequestType(
				FoldingRangeRequest2.method
			);
		})(
			(FoldingRangeRequest =
				exports.FoldingRangeRequest || (exports.FoldingRangeRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.declaration.js
let require_protocol_declaration = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.declaration.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.DeclarationRequest = void 0;
		let messages_1 = require_messages2();
		let DeclarationRequest;
		(function (DeclarationRequest2) {
			DeclarationRequest2.method = 'textDocument/declaration';
			DeclarationRequest2.type = new messages_1.ProtocolRequestType(
				DeclarationRequest2.method
			);
		})(
			(DeclarationRequest =
				exports.DeclarationRequest || (exports.DeclarationRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.selectionRange.js
let require_protocol_selectionRange = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.selectionRange.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.SelectionRangeRequest = void 0;
		let messages_1 = require_messages2();
		let SelectionRangeRequest;
		(function (SelectionRangeRequest2) {
			SelectionRangeRequest2.method = 'textDocument/selectionRange';
			SelectionRangeRequest2.type = new messages_1.ProtocolRequestType(
				SelectionRangeRequest2.method
			);
		})(
			(SelectionRangeRequest =
				exports.SelectionRangeRequest || (exports.SelectionRangeRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.progress.js
let require_protocol_progress = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.progress.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.WorkDoneProgressCancelNotification = exports.WorkDoneProgressCreateRequest = exports.WorkDoneProgress = void 0;
		let vscode_jsonrpc_1 = require_main();
		let messages_1 = require_messages2();
		let WorkDoneProgress;
		(function (WorkDoneProgress2) {
			WorkDoneProgress2.type = new vscode_jsonrpc_1.ProgressType();
			function is2(value) {
				return value === WorkDoneProgress2.type;
			}
			WorkDoneProgress2.is = is2;
		})(
			(WorkDoneProgress =
				exports.WorkDoneProgress || (exports.WorkDoneProgress = {}))
		);
		let WorkDoneProgressCreateRequest;
		(function (WorkDoneProgressCreateRequest2) {
			WorkDoneProgressCreateRequest2.type = new messages_1.ProtocolRequestType(
				'window/workDoneProgress/create'
			);
		})(
			(WorkDoneProgressCreateRequest =
				exports.WorkDoneProgressCreateRequest ||
				(exports.WorkDoneProgressCreateRequest = {}))
		);
		let WorkDoneProgressCancelNotification;
		(function (WorkDoneProgressCancelNotification2) {
			WorkDoneProgressCancelNotification2.type = new messages_1.ProtocolNotificationType(
				'window/workDoneProgress/cancel'
			);
		})(
			(WorkDoneProgressCancelNotification =
				exports.WorkDoneProgressCancelNotification ||
				(exports.WorkDoneProgressCancelNotification = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.callHierarchy.js
let require_protocol_callHierarchy = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.callHierarchy.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.CallHierarchyOutgoingCallsRequest = exports.CallHierarchyIncomingCallsRequest = exports.CallHierarchyPrepareRequest = void 0;
		let messages_1 = require_messages2();
		let CallHierarchyPrepareRequest;
		(function (CallHierarchyPrepareRequest2) {
			CallHierarchyPrepareRequest2.method = 'textDocument/prepareCallHierarchy';
			CallHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(
				CallHierarchyPrepareRequest2.method
			);
		})(
			(CallHierarchyPrepareRequest =
				exports.CallHierarchyPrepareRequest ||
				(exports.CallHierarchyPrepareRequest = {}))
		);
		let CallHierarchyIncomingCallsRequest;
		(function (CallHierarchyIncomingCallsRequest2) {
			CallHierarchyIncomingCallsRequest2.method = 'callHierarchy/incomingCalls';
			CallHierarchyIncomingCallsRequest2.type = new messages_1.ProtocolRequestType(
				CallHierarchyIncomingCallsRequest2.method
			);
		})(
			(CallHierarchyIncomingCallsRequest =
				exports.CallHierarchyIncomingCallsRequest ||
				(exports.CallHierarchyIncomingCallsRequest = {}))
		);
		let CallHierarchyOutgoingCallsRequest;
		(function (CallHierarchyOutgoingCallsRequest2) {
			CallHierarchyOutgoingCallsRequest2.method = 'callHierarchy/outgoingCalls';
			CallHierarchyOutgoingCallsRequest2.type = new messages_1.ProtocolRequestType(
				CallHierarchyOutgoingCallsRequest2.method
			);
		})(
			(CallHierarchyOutgoingCallsRequest =
				exports.CallHierarchyOutgoingCallsRequest ||
				(exports.CallHierarchyOutgoingCallsRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.semanticTokens.js
let require_protocol_semanticTokens = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.semanticTokens.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.SemanticTokensRefreshRequest = exports.SemanticTokensRangeRequest = exports.SemanticTokensDeltaRequest = exports.SemanticTokensRequest = exports.SemanticTokensRegistrationType = exports.TokenFormat = void 0;
		let messages_1 = require_messages2();
		let TokenFormat;
		(function (TokenFormat2) {
			TokenFormat2.Relative = 'relative';
		})((TokenFormat = exports.TokenFormat || (exports.TokenFormat = {})));
		let SemanticTokensRegistrationType;
		(function (SemanticTokensRegistrationType2) {
			SemanticTokensRegistrationType2.method = 'textDocument/semanticTokens';
			SemanticTokensRegistrationType2.type = new messages_1.RegistrationType(
				SemanticTokensRegistrationType2.method
			);
		})(
			(SemanticTokensRegistrationType =
				exports.SemanticTokensRegistrationType ||
				(exports.SemanticTokensRegistrationType = {}))
		);
		let SemanticTokensRequest;
		(function (SemanticTokensRequest2) {
			SemanticTokensRequest2.method = 'textDocument/semanticTokens/full';
			SemanticTokensRequest2.type = new messages_1.ProtocolRequestType(
				SemanticTokensRequest2.method
			);
		})(
			(SemanticTokensRequest =
				exports.SemanticTokensRequest || (exports.SemanticTokensRequest = {}))
		);
		let SemanticTokensDeltaRequest;
		(function (SemanticTokensDeltaRequest2) {
			SemanticTokensDeltaRequest2.method =
				'textDocument/semanticTokens/full/delta';
			SemanticTokensDeltaRequest2.type = new messages_1.ProtocolRequestType(
				SemanticTokensDeltaRequest2.method
			);
		})(
			(SemanticTokensDeltaRequest =
				exports.SemanticTokensDeltaRequest ||
				(exports.SemanticTokensDeltaRequest = {}))
		);
		let SemanticTokensRangeRequest;
		(function (SemanticTokensRangeRequest2) {
			SemanticTokensRangeRequest2.method = 'textDocument/semanticTokens/range';
			SemanticTokensRangeRequest2.type = new messages_1.ProtocolRequestType(
				SemanticTokensRangeRequest2.method
			);
		})(
			(SemanticTokensRangeRequest =
				exports.SemanticTokensRangeRequest ||
				(exports.SemanticTokensRangeRequest = {}))
		);
		let SemanticTokensRefreshRequest;
		(function (SemanticTokensRefreshRequest2) {
			SemanticTokensRefreshRequest2.method = `workspace/semanticTokens/refresh`;
			SemanticTokensRefreshRequest2.type = new messages_1.ProtocolRequestType0(
				SemanticTokensRefreshRequest2.method
			);
		})(
			(SemanticTokensRefreshRequest =
				exports.SemanticTokensRefreshRequest ||
				(exports.SemanticTokensRefreshRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.showDocument.js
let require_protocol_showDocument = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.showDocument.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ShowDocumentRequest = void 0;
		let messages_1 = require_messages2();
		let ShowDocumentRequest;
		(function (ShowDocumentRequest2) {
			ShowDocumentRequest2.method = 'window/showDocument';
			ShowDocumentRequest2.type = new messages_1.ProtocolRequestType(
				ShowDocumentRequest2.method
			);
		})(
			(ShowDocumentRequest =
				exports.ShowDocumentRequest || (exports.ShowDocumentRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.linkedEditingRange.js
let require_protocol_linkedEditingRange = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.linkedEditingRange.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.LinkedEditingRangeRequest = void 0;
		let messages_1 = require_messages2();
		let LinkedEditingRangeRequest;
		(function (LinkedEditingRangeRequest2) {
			LinkedEditingRangeRequest2.method = 'textDocument/linkedEditingRange';
			LinkedEditingRangeRequest2.type = new messages_1.ProtocolRequestType(
				LinkedEditingRangeRequest2.method
			);
		})(
			(LinkedEditingRangeRequest =
				exports.LinkedEditingRangeRequest ||
				(exports.LinkedEditingRangeRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.fileOperations.js
let require_protocol_fileOperations = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.fileOperations.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.WillDeleteFilesRequest = exports.DidDeleteFilesNotification = exports.DidRenameFilesNotification = exports.WillRenameFilesRequest = exports.DidCreateFilesNotification = exports.WillCreateFilesRequest = exports.FileOperationPatternKind = void 0;
		let messages_1 = require_messages2();
		let FileOperationPatternKind;
		(function (FileOperationPatternKind2) {
			FileOperationPatternKind2.file = 'file';
			FileOperationPatternKind2.folder = 'folder';
		})(
			(FileOperationPatternKind =
				exports.FileOperationPatternKind ||
				(exports.FileOperationPatternKind = {}))
		);
		let WillCreateFilesRequest;
		(function (WillCreateFilesRequest2) {
			WillCreateFilesRequest2.method = 'workspace/willCreateFiles';
			WillCreateFilesRequest2.type = new messages_1.ProtocolRequestType(
				WillCreateFilesRequest2.method
			);
		})(
			(WillCreateFilesRequest =
				exports.WillCreateFilesRequest || (exports.WillCreateFilesRequest = {}))
		);
		let DidCreateFilesNotification;
		(function (DidCreateFilesNotification2) {
			DidCreateFilesNotification2.method = 'workspace/didCreateFiles';
			DidCreateFilesNotification2.type = new messages_1.ProtocolNotificationType(
				DidCreateFilesNotification2.method
			);
		})(
			(DidCreateFilesNotification =
				exports.DidCreateFilesNotification ||
				(exports.DidCreateFilesNotification = {}))
		);
		let WillRenameFilesRequest;
		(function (WillRenameFilesRequest2) {
			WillRenameFilesRequest2.method = 'workspace/willRenameFiles';
			WillRenameFilesRequest2.type = new messages_1.ProtocolRequestType(
				WillRenameFilesRequest2.method
			);
		})(
			(WillRenameFilesRequest =
				exports.WillRenameFilesRequest || (exports.WillRenameFilesRequest = {}))
		);
		let DidRenameFilesNotification;
		(function (DidRenameFilesNotification2) {
			DidRenameFilesNotification2.method = 'workspace/didRenameFiles';
			DidRenameFilesNotification2.type = new messages_1.ProtocolNotificationType(
				DidRenameFilesNotification2.method
			);
		})(
			(DidRenameFilesNotification =
				exports.DidRenameFilesNotification ||
				(exports.DidRenameFilesNotification = {}))
		);
		let DidDeleteFilesNotification;
		(function (DidDeleteFilesNotification2) {
			DidDeleteFilesNotification2.method = 'workspace/didDeleteFiles';
			DidDeleteFilesNotification2.type = new messages_1.ProtocolNotificationType(
				DidDeleteFilesNotification2.method
			);
		})(
			(DidDeleteFilesNotification =
				exports.DidDeleteFilesNotification ||
				(exports.DidDeleteFilesNotification = {}))
		);
		let WillDeleteFilesRequest;
		(function (WillDeleteFilesRequest2) {
			WillDeleteFilesRequest2.method = 'workspace/willDeleteFiles';
			WillDeleteFilesRequest2.type = new messages_1.ProtocolRequestType(
				WillDeleteFilesRequest2.method
			);
		})(
			(WillDeleteFilesRequest =
				exports.WillDeleteFilesRequest || (exports.WillDeleteFilesRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.moniker.js
let require_protocol_moniker = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.moniker.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.MonikerRequest = exports.MonikerKind = exports.UniquenessLevel = void 0;
		let messages_1 = require_messages2();
		let UniquenessLevel;
		(function (UniquenessLevel2) {
			UniquenessLevel2['document'] = 'document';
			UniquenessLevel2['project'] = 'project';
			UniquenessLevel2['group'] = 'group';
			UniquenessLevel2['scheme'] = 'scheme';
			UniquenessLevel2['global'] = 'global';
		})(
			(UniquenessLevel =
				exports.UniquenessLevel || (exports.UniquenessLevel = {}))
		);
		let MonikerKind;
		(function (MonikerKind2) {
			MonikerKind2['import'] = 'import';
			MonikerKind2['export'] = 'export';
			MonikerKind2['local'] = 'local';
		})((MonikerKind = exports.MonikerKind || (exports.MonikerKind = {})));
		let MonikerRequest;
		(function (MonikerRequest2) {
			MonikerRequest2.method = 'textDocument/moniker';
			MonikerRequest2.type = new messages_1.ProtocolRequestType(
				MonikerRequest2.method
			);
		})(
			(MonikerRequest = exports.MonikerRequest || (exports.MonikerRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/protocol.js
let require_protocol = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/protocol.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.CodeLensRefreshRequest = exports.CodeLensResolveRequest = exports.CodeLensRequest = exports.WorkspaceSymbolResolveRequest = exports.WorkspaceSymbolRequest = exports.CodeActionResolveRequest = exports.CodeActionRequest = exports.DocumentSymbolRequest = exports.DocumentHighlightRequest = exports.ReferencesRequest = exports.DefinitionRequest = exports.SignatureHelpRequest = exports.SignatureHelpTriggerKind = exports.HoverRequest = exports.CompletionResolveRequest = exports.CompletionRequest = exports.CompletionTriggerKind = exports.PublishDiagnosticsNotification = exports.WatchKind = exports.FileChangeType = exports.DidChangeWatchedFilesNotification = exports.WillSaveTextDocumentWaitUntilRequest = exports.WillSaveTextDocumentNotification = exports.TextDocumentSaveReason = exports.DidSaveTextDocumentNotification = exports.DidCloseTextDocumentNotification = exports.DidChangeTextDocumentNotification = exports.TextDocumentContentChangeEvent = exports.DidOpenTextDocumentNotification = exports.TextDocumentSyncKind = exports.TelemetryEventNotification = exports.LogMessageNotification = exports.ShowMessageRequest = exports.ShowMessageNotification = exports.MessageType = exports.DidChangeConfigurationNotification = exports.ExitNotification = exports.ShutdownRequest = exports.InitializedNotification = exports.InitializeError = exports.InitializeRequest = exports.WorkDoneProgressOptions = exports.TextDocumentRegistrationOptions = exports.StaticRegistrationOptions = exports.FailureHandlingKind = exports.ResourceOperationKind = exports.UnregistrationRequest = exports.RegistrationRequest = exports.DocumentSelector = exports.DocumentFilter = void 0;
		exports.MonikerRequest = exports.MonikerKind = exports.UniquenessLevel = exports.WillDeleteFilesRequest = exports.DidDeleteFilesNotification = exports.WillRenameFilesRequest = exports.DidRenameFilesNotification = exports.WillCreateFilesRequest = exports.DidCreateFilesNotification = exports.FileOperationPatternKind = exports.LinkedEditingRangeRequest = exports.ShowDocumentRequest = exports.SemanticTokensRegistrationType = exports.SemanticTokensRefreshRequest = exports.SemanticTokensRangeRequest = exports.SemanticTokensDeltaRequest = exports.SemanticTokensRequest = exports.TokenFormat = exports.CallHierarchyPrepareRequest = exports.CallHierarchyOutgoingCallsRequest = exports.CallHierarchyIncomingCallsRequest = exports.WorkDoneProgressCancelNotification = exports.WorkDoneProgressCreateRequest = exports.WorkDoneProgress = exports.SelectionRangeRequest = exports.DeclarationRequest = exports.FoldingRangeRequest = exports.ColorPresentationRequest = exports.DocumentColorRequest = exports.ConfigurationRequest = exports.DidChangeWorkspaceFoldersNotification = exports.WorkspaceFoldersRequest = exports.TypeDefinitionRequest = exports.ImplementationRequest = exports.ApplyWorkspaceEditRequest = exports.ExecuteCommandRequest = exports.PrepareRenameRequest = exports.RenameRequest = exports.PrepareSupportDefaultBehavior = exports.DocumentOnTypeFormattingRequest = exports.DocumentRangeFormattingRequest = exports.DocumentFormattingRequest = exports.DocumentLinkResolveRequest = exports.DocumentLinkRequest = void 0;
		let messages_1 = require_messages2();
		let Is2 = require_is2();
		let protocol_implementation_1 = require_protocol_implementation();
		Object.defineProperty(exports, 'ImplementationRequest', {
			enumerable: true,
			get: function () {
				return protocol_implementation_1.ImplementationRequest;
			},
		});
		let protocol_typeDefinition_1 = require_protocol_typeDefinition();
		Object.defineProperty(exports, 'TypeDefinitionRequest', {
			enumerable: true,
			get: function () {
				return protocol_typeDefinition_1.TypeDefinitionRequest;
			},
		});
		let protocol_workspaceFolders_1 = require_protocol_workspaceFolders();
		Object.defineProperty(exports, 'WorkspaceFoldersRequest', {
			enumerable: true,
			get: function () {
				return protocol_workspaceFolders_1.WorkspaceFoldersRequest;
			},
		});
		Object.defineProperty(exports, 'DidChangeWorkspaceFoldersNotification', {
			enumerable: true,
			get: function () {
				return protocol_workspaceFolders_1.DidChangeWorkspaceFoldersNotification;
			},
		});
		let protocol_configuration_1 = require_protocol_configuration();
		Object.defineProperty(exports, 'ConfigurationRequest', {
			enumerable: true,
			get: function () {
				return protocol_configuration_1.ConfigurationRequest;
			},
		});
		let protocol_colorProvider_1 = require_protocol_colorProvider();
		Object.defineProperty(exports, 'DocumentColorRequest', {
			enumerable: true,
			get: function () {
				return protocol_colorProvider_1.DocumentColorRequest;
			},
		});
		Object.defineProperty(exports, 'ColorPresentationRequest', {
			enumerable: true,
			get: function () {
				return protocol_colorProvider_1.ColorPresentationRequest;
			},
		});
		let protocol_foldingRange_1 = require_protocol_foldingRange();
		Object.defineProperty(exports, 'FoldingRangeRequest', {
			enumerable: true,
			get: function () {
				return protocol_foldingRange_1.FoldingRangeRequest;
			},
		});
		let protocol_declaration_1 = require_protocol_declaration();
		Object.defineProperty(exports, 'DeclarationRequest', {
			enumerable: true,
			get: function () {
				return protocol_declaration_1.DeclarationRequest;
			},
		});
		let protocol_selectionRange_1 = require_protocol_selectionRange();
		Object.defineProperty(exports, 'SelectionRangeRequest', {
			enumerable: true,
			get: function () {
				return protocol_selectionRange_1.SelectionRangeRequest;
			},
		});
		let protocol_progress_1 = require_protocol_progress();
		Object.defineProperty(exports, 'WorkDoneProgress', {
			enumerable: true,
			get: function () {
				return protocol_progress_1.WorkDoneProgress;
			},
		});
		Object.defineProperty(exports, 'WorkDoneProgressCreateRequest', {
			enumerable: true,
			get: function () {
				return protocol_progress_1.WorkDoneProgressCreateRequest;
			},
		});
		Object.defineProperty(exports, 'WorkDoneProgressCancelNotification', {
			enumerable: true,
			get: function () {
				return protocol_progress_1.WorkDoneProgressCancelNotification;
			},
		});
		let protocol_callHierarchy_1 = require_protocol_callHierarchy();
		Object.defineProperty(exports, 'CallHierarchyIncomingCallsRequest', {
			enumerable: true,
			get: function () {
				return protocol_callHierarchy_1.CallHierarchyIncomingCallsRequest;
			},
		});
		Object.defineProperty(exports, 'CallHierarchyOutgoingCallsRequest', {
			enumerable: true,
			get: function () {
				return protocol_callHierarchy_1.CallHierarchyOutgoingCallsRequest;
			},
		});
		Object.defineProperty(exports, 'CallHierarchyPrepareRequest', {
			enumerable: true,
			get: function () {
				return protocol_callHierarchy_1.CallHierarchyPrepareRequest;
			},
		});
		let protocol_semanticTokens_1 = require_protocol_semanticTokens();
		Object.defineProperty(exports, 'TokenFormat', {
			enumerable: true,
			get: function () {
				return protocol_semanticTokens_1.TokenFormat;
			},
		});
		Object.defineProperty(exports, 'SemanticTokensRequest', {
			enumerable: true,
			get: function () {
				return protocol_semanticTokens_1.SemanticTokensRequest;
			},
		});
		Object.defineProperty(exports, 'SemanticTokensDeltaRequest', {
			enumerable: true,
			get: function () {
				return protocol_semanticTokens_1.SemanticTokensDeltaRequest;
			},
		});
		Object.defineProperty(exports, 'SemanticTokensRangeRequest', {
			enumerable: true,
			get: function () {
				return protocol_semanticTokens_1.SemanticTokensRangeRequest;
			},
		});
		Object.defineProperty(exports, 'SemanticTokensRefreshRequest', {
			enumerable: true,
			get: function () {
				return protocol_semanticTokens_1.SemanticTokensRefreshRequest;
			},
		});
		Object.defineProperty(exports, 'SemanticTokensRegistrationType', {
			enumerable: true,
			get: function () {
				return protocol_semanticTokens_1.SemanticTokensRegistrationType;
			},
		});
		let protocol_showDocument_1 = require_protocol_showDocument();
		Object.defineProperty(exports, 'ShowDocumentRequest', {
			enumerable: true,
			get: function () {
				return protocol_showDocument_1.ShowDocumentRequest;
			},
		});
		let protocol_linkedEditingRange_1 = require_protocol_linkedEditingRange();
		Object.defineProperty(exports, 'LinkedEditingRangeRequest', {
			enumerable: true,
			get: function () {
				return protocol_linkedEditingRange_1.LinkedEditingRangeRequest;
			},
		});
		let protocol_fileOperations_1 = require_protocol_fileOperations();
		Object.defineProperty(exports, 'FileOperationPatternKind', {
			enumerable: true,
			get: function () {
				return protocol_fileOperations_1.FileOperationPatternKind;
			},
		});
		Object.defineProperty(exports, 'DidCreateFilesNotification', {
			enumerable: true,
			get: function () {
				return protocol_fileOperations_1.DidCreateFilesNotification;
			},
		});
		Object.defineProperty(exports, 'WillCreateFilesRequest', {
			enumerable: true,
			get: function () {
				return protocol_fileOperations_1.WillCreateFilesRequest;
			},
		});
		Object.defineProperty(exports, 'DidRenameFilesNotification', {
			enumerable: true,
			get: function () {
				return protocol_fileOperations_1.DidRenameFilesNotification;
			},
		});
		Object.defineProperty(exports, 'WillRenameFilesRequest', {
			enumerable: true,
			get: function () {
				return protocol_fileOperations_1.WillRenameFilesRequest;
			},
		});
		Object.defineProperty(exports, 'DidDeleteFilesNotification', {
			enumerable: true,
			get: function () {
				return protocol_fileOperations_1.DidDeleteFilesNotification;
			},
		});
		Object.defineProperty(exports, 'WillDeleteFilesRequest', {
			enumerable: true,
			get: function () {
				return protocol_fileOperations_1.WillDeleteFilesRequest;
			},
		});
		let protocol_moniker_1 = require_protocol_moniker();
		Object.defineProperty(exports, 'UniquenessLevel', {
			enumerable: true,
			get: function () {
				return protocol_moniker_1.UniquenessLevel;
			},
		});
		Object.defineProperty(exports, 'MonikerKind', {
			enumerable: true,
			get: function () {
				return protocol_moniker_1.MonikerKind;
			},
		});
		Object.defineProperty(exports, 'MonikerRequest', {
			enumerable: true,
			get: function () {
				return protocol_moniker_1.MonikerRequest;
			},
		});
		let DocumentFilter;
		(function (DocumentFilter2) {
			function is2(value) {
				const candidate = value;
				return (
					Is2.string(candidate.language) ||
					Is2.string(candidate.scheme) ||
					Is2.string(candidate.pattern)
				);
			}
			DocumentFilter2.is = is2;
		})(
			(DocumentFilter = exports.DocumentFilter || (exports.DocumentFilter = {}))
		);
		let DocumentSelector;
		(function (DocumentSelector2) {
			function is2(value) {
				if (!Array.isArray(value)) {
					return false;
				}
				for (let elem of value) {
					if (!Is2.string(elem) && !DocumentFilter.is(elem)) {
						return false;
					}
				}
				return true;
			}
			DocumentSelector2.is = is2;
		})(
			(DocumentSelector =
				exports.DocumentSelector || (exports.DocumentSelector = {}))
		);
		let RegistrationRequest;
		(function (RegistrationRequest2) {
			RegistrationRequest2.type = new messages_1.ProtocolRequestType(
				'client/registerCapability'
			);
		})(
			(RegistrationRequest =
				exports.RegistrationRequest || (exports.RegistrationRequest = {}))
		);
		let UnregistrationRequest;
		(function (UnregistrationRequest2) {
			UnregistrationRequest2.type = new messages_1.ProtocolRequestType(
				'client/unregisterCapability'
			);
		})(
			(UnregistrationRequest =
				exports.UnregistrationRequest || (exports.UnregistrationRequest = {}))
		);
		let ResourceOperationKind;
		(function (ResourceOperationKind2) {
			ResourceOperationKind2.Create = 'create';
			ResourceOperationKind2.Rename = 'rename';
			ResourceOperationKind2.Delete = 'delete';
		})(
			(ResourceOperationKind =
				exports.ResourceOperationKind || (exports.ResourceOperationKind = {}))
		);
		let FailureHandlingKind;
		(function (FailureHandlingKind2) {
			FailureHandlingKind2.Abort = 'abort';
			FailureHandlingKind2.Transactional = 'transactional';
			FailureHandlingKind2.TextOnlyTransactional = 'textOnlyTransactional';
			FailureHandlingKind2.Undo = 'undo';
		})(
			(FailureHandlingKind =
				exports.FailureHandlingKind || (exports.FailureHandlingKind = {}))
		);
		let StaticRegistrationOptions;
		(function (StaticRegistrationOptions2) {
			function hasId(value) {
				const candidate = value;
				return candidate && Is2.string(candidate.id) && candidate.id.length > 0;
			}
			StaticRegistrationOptions2.hasId = hasId;
		})(
			(StaticRegistrationOptions =
				exports.StaticRegistrationOptions ||
				(exports.StaticRegistrationOptions = {}))
		);
		let TextDocumentRegistrationOptions;
		(function (TextDocumentRegistrationOptions2) {
			function is2(value) {
				const candidate = value;
				return (
					candidate &&
					(candidate.documentSelector === null ||
						DocumentSelector.is(candidate.documentSelector))
				);
			}
			TextDocumentRegistrationOptions2.is = is2;
		})(
			(TextDocumentRegistrationOptions =
				exports.TextDocumentRegistrationOptions ||
				(exports.TextDocumentRegistrationOptions = {}))
		);
		let WorkDoneProgressOptions;
		(function (WorkDoneProgressOptions2) {
			function is2(value) {
				const candidate = value;
				return (
					Is2.objectLiteral(candidate) &&
					(candidate.workDoneProgress === void 0 ||
						Is2.boolean(candidate.workDoneProgress))
				);
			}
			WorkDoneProgressOptions2.is = is2;
			function hasWorkDoneProgress(value) {
				const candidate = value;
				return candidate && Is2.boolean(candidate.workDoneProgress);
			}
			WorkDoneProgressOptions2.hasWorkDoneProgress = hasWorkDoneProgress;
		})(
			(WorkDoneProgressOptions =
				exports.WorkDoneProgressOptions ||
				(exports.WorkDoneProgressOptions = {}))
		);
		let InitializeRequest;
		(function (InitializeRequest2) {
			InitializeRequest2.type = new messages_1.ProtocolRequestType(
				'initialize'
			);
		})(
			(InitializeRequest =
				exports.InitializeRequest || (exports.InitializeRequest = {}))
		);
		let InitializeError;
		(function (InitializeError2) {
			InitializeError2.unknownProtocolVersion = 1;
		})(
			(InitializeError =
				exports.InitializeError || (exports.InitializeError = {}))
		);
		let InitializedNotification;
		(function (InitializedNotification2) {
			InitializedNotification2.type = new messages_1.ProtocolNotificationType(
				'initialized'
			);
		})(
			(InitializedNotification =
				exports.InitializedNotification ||
				(exports.InitializedNotification = {}))
		);
		let ShutdownRequest;
		(function (ShutdownRequest2) {
			ShutdownRequest2.type = new messages_1.ProtocolRequestType0('shutdown');
		})(
			(ShutdownRequest =
				exports.ShutdownRequest || (exports.ShutdownRequest = {}))
		);
		let ExitNotification;
		(function (ExitNotification2) {
			ExitNotification2.type = new messages_1.ProtocolNotificationType0('exit');
		})(
			(ExitNotification =
				exports.ExitNotification || (exports.ExitNotification = {}))
		);
		let DidChangeConfigurationNotification;
		(function (DidChangeConfigurationNotification2) {
			DidChangeConfigurationNotification2.type = new messages_1.ProtocolNotificationType(
				'workspace/didChangeConfiguration'
			);
		})(
			(DidChangeConfigurationNotification =
				exports.DidChangeConfigurationNotification ||
				(exports.DidChangeConfigurationNotification = {}))
		);
		let MessageType;
		(function (MessageType2) {
			MessageType2.Error = 1;
			MessageType2.Warning = 2;
			MessageType2.Info = 3;
			MessageType2.Log = 4;
		})((MessageType = exports.MessageType || (exports.MessageType = {})));
		let ShowMessageNotification;
		(function (ShowMessageNotification2) {
			ShowMessageNotification2.type = new messages_1.ProtocolNotificationType(
				'window/showMessage'
			);
		})(
			(ShowMessageNotification =
				exports.ShowMessageNotification ||
				(exports.ShowMessageNotification = {}))
		);
		let ShowMessageRequest;
		(function (ShowMessageRequest2) {
			ShowMessageRequest2.type = new messages_1.ProtocolRequestType(
				'window/showMessageRequest'
			);
		})(
			(ShowMessageRequest =
				exports.ShowMessageRequest || (exports.ShowMessageRequest = {}))
		);
		let LogMessageNotification;
		(function (LogMessageNotification2) {
			LogMessageNotification2.type = new messages_1.ProtocolNotificationType(
				'window/logMessage'
			);
		})(
			(LogMessageNotification =
				exports.LogMessageNotification || (exports.LogMessageNotification = {}))
		);
		let TelemetryEventNotification;
		(function (TelemetryEventNotification2) {
			TelemetryEventNotification2.type = new messages_1.ProtocolNotificationType(
				'telemetry/event'
			);
		})(
			(TelemetryEventNotification =
				exports.TelemetryEventNotification ||
				(exports.TelemetryEventNotification = {}))
		);
		let TextDocumentSyncKind;
		(function (TextDocumentSyncKind2) {
			TextDocumentSyncKind2.None = 0;
			TextDocumentSyncKind2.Full = 1;
			TextDocumentSyncKind2.Incremental = 2;
		})(
			(TextDocumentSyncKind =
				exports.TextDocumentSyncKind || (exports.TextDocumentSyncKind = {}))
		);
		let DidOpenTextDocumentNotification;
		(function (DidOpenTextDocumentNotification2) {
			DidOpenTextDocumentNotification2.method = 'textDocument/didOpen';
			DidOpenTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
				DidOpenTextDocumentNotification2.method
			);
		})(
			(DidOpenTextDocumentNotification =
				exports.DidOpenTextDocumentNotification ||
				(exports.DidOpenTextDocumentNotification = {}))
		);
		let TextDocumentContentChangeEvent;
		(function (TextDocumentContentChangeEvent2) {
			function isIncremental(event) {
				let candidate = event;
				return (
					candidate !== void 0 &&
					candidate !== null &&
					typeof candidate.text === 'string' &&
					candidate.range !== void 0 &&
					(candidate.rangeLength === void 0 ||
						typeof candidate.rangeLength === 'number')
				);
			}
			TextDocumentContentChangeEvent2.isIncremental = isIncremental;
			function isFull(event) {
				let candidate = event;
				return (
					candidate !== void 0 &&
					candidate !== null &&
					typeof candidate.text === 'string' &&
					candidate.range === void 0 &&
					candidate.rangeLength === void 0
				);
			}
			TextDocumentContentChangeEvent2.isFull = isFull;
		})(
			(TextDocumentContentChangeEvent =
				exports.TextDocumentContentChangeEvent ||
				(exports.TextDocumentContentChangeEvent = {}))
		);
		let DidChangeTextDocumentNotification;
		(function (DidChangeTextDocumentNotification2) {
			DidChangeTextDocumentNotification2.method = 'textDocument/didChange';
			DidChangeTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
				DidChangeTextDocumentNotification2.method
			);
		})(
			(DidChangeTextDocumentNotification =
				exports.DidChangeTextDocumentNotification ||
				(exports.DidChangeTextDocumentNotification = {}))
		);
		let DidCloseTextDocumentNotification;
		(function (DidCloseTextDocumentNotification2) {
			DidCloseTextDocumentNotification2.method = 'textDocument/didClose';
			DidCloseTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
				DidCloseTextDocumentNotification2.method
			);
		})(
			(DidCloseTextDocumentNotification =
				exports.DidCloseTextDocumentNotification ||
				(exports.DidCloseTextDocumentNotification = {}))
		);
		let DidSaveTextDocumentNotification;
		(function (DidSaveTextDocumentNotification2) {
			DidSaveTextDocumentNotification2.method = 'textDocument/didSave';
			DidSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
				DidSaveTextDocumentNotification2.method
			);
		})(
			(DidSaveTextDocumentNotification =
				exports.DidSaveTextDocumentNotification ||
				(exports.DidSaveTextDocumentNotification = {}))
		);
		let TextDocumentSaveReason;
		(function (TextDocumentSaveReason2) {
			TextDocumentSaveReason2.Manual = 1;
			TextDocumentSaveReason2.AfterDelay = 2;
			TextDocumentSaveReason2.FocusOut = 3;
		})(
			(TextDocumentSaveReason =
				exports.TextDocumentSaveReason || (exports.TextDocumentSaveReason = {}))
		);
		let WillSaveTextDocumentNotification;
		(function (WillSaveTextDocumentNotification2) {
			WillSaveTextDocumentNotification2.method = 'textDocument/willSave';
			WillSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
				WillSaveTextDocumentNotification2.method
			);
		})(
			(WillSaveTextDocumentNotification =
				exports.WillSaveTextDocumentNotification ||
				(exports.WillSaveTextDocumentNotification = {}))
		);
		let WillSaveTextDocumentWaitUntilRequest;
		(function (WillSaveTextDocumentWaitUntilRequest2) {
			WillSaveTextDocumentWaitUntilRequest2.method =
				'textDocument/willSaveWaitUntil';
			WillSaveTextDocumentWaitUntilRequest2.type = new messages_1.ProtocolRequestType(
				WillSaveTextDocumentWaitUntilRequest2.method
			);
		})(
			(WillSaveTextDocumentWaitUntilRequest =
				exports.WillSaveTextDocumentWaitUntilRequest ||
				(exports.WillSaveTextDocumentWaitUntilRequest = {}))
		);
		let DidChangeWatchedFilesNotification;
		(function (DidChangeWatchedFilesNotification2) {
			DidChangeWatchedFilesNotification2.type = new messages_1.ProtocolNotificationType(
				'workspace/didChangeWatchedFiles'
			);
		})(
			(DidChangeWatchedFilesNotification =
				exports.DidChangeWatchedFilesNotification ||
				(exports.DidChangeWatchedFilesNotification = {}))
		);
		let FileChangeType;
		(function (FileChangeType2) {
			FileChangeType2.Created = 1;
			FileChangeType2.Changed = 2;
			FileChangeType2.Deleted = 3;
		})(
			(FileChangeType = exports.FileChangeType || (exports.FileChangeType = {}))
		);
		let WatchKind;
		(function (WatchKind2) {
			WatchKind2.Create = 1;
			WatchKind2.Change = 2;
			WatchKind2.Delete = 4;
		})((WatchKind = exports.WatchKind || (exports.WatchKind = {})));
		let PublishDiagnosticsNotification;
		(function (PublishDiagnosticsNotification2) {
			PublishDiagnosticsNotification2.type = new messages_1.ProtocolNotificationType(
				'textDocument/publishDiagnostics'
			);
		})(
			(PublishDiagnosticsNotification =
				exports.PublishDiagnosticsNotification ||
				(exports.PublishDiagnosticsNotification = {}))
		);
		let CompletionTriggerKind;
		(function (CompletionTriggerKind2) {
			CompletionTriggerKind2.Invoked = 1;
			CompletionTriggerKind2.TriggerCharacter = 2;
			CompletionTriggerKind2.TriggerForIncompleteCompletions = 3;
		})(
			(CompletionTriggerKind =
				exports.CompletionTriggerKind || (exports.CompletionTriggerKind = {}))
		);
		let CompletionRequest;
		(function (CompletionRequest2) {
			CompletionRequest2.method = 'textDocument/completion';
			CompletionRequest2.type = new messages_1.ProtocolRequestType(
				CompletionRequest2.method
			);
		})(
			(CompletionRequest =
				exports.CompletionRequest || (exports.CompletionRequest = {}))
		);
		let CompletionResolveRequest;
		(function (CompletionResolveRequest2) {
			CompletionResolveRequest2.method = 'completionItem/resolve';
			CompletionResolveRequest2.type = new messages_1.ProtocolRequestType(
				CompletionResolveRequest2.method
			);
		})(
			(CompletionResolveRequest =
				exports.CompletionResolveRequest ||
				(exports.CompletionResolveRequest = {}))
		);
		let HoverRequest;
		(function (HoverRequest2) {
			HoverRequest2.method = 'textDocument/hover';
			HoverRequest2.type = new messages_1.ProtocolRequestType(
				HoverRequest2.method
			);
		})((HoverRequest = exports.HoverRequest || (exports.HoverRequest = {})));
		let SignatureHelpTriggerKind;
		(function (SignatureHelpTriggerKind2) {
			SignatureHelpTriggerKind2.Invoked = 1;
			SignatureHelpTriggerKind2.TriggerCharacter = 2;
			SignatureHelpTriggerKind2.ContentChange = 3;
		})(
			(SignatureHelpTriggerKind =
				exports.SignatureHelpTriggerKind ||
				(exports.SignatureHelpTriggerKind = {}))
		);
		let SignatureHelpRequest;
		(function (SignatureHelpRequest2) {
			SignatureHelpRequest2.method = 'textDocument/signatureHelp';
			SignatureHelpRequest2.type = new messages_1.ProtocolRequestType(
				SignatureHelpRequest2.method
			);
		})(
			(SignatureHelpRequest =
				exports.SignatureHelpRequest || (exports.SignatureHelpRequest = {}))
		);
		let DefinitionRequest;
		(function (DefinitionRequest2) {
			DefinitionRequest2.method = 'textDocument/definition';
			DefinitionRequest2.type = new messages_1.ProtocolRequestType(
				DefinitionRequest2.method
			);
		})(
			(DefinitionRequest =
				exports.DefinitionRequest || (exports.DefinitionRequest = {}))
		);
		let ReferencesRequest;
		(function (ReferencesRequest2) {
			ReferencesRequest2.method = 'textDocument/references';
			ReferencesRequest2.type = new messages_1.ProtocolRequestType(
				ReferencesRequest2.method
			);
		})(
			(ReferencesRequest =
				exports.ReferencesRequest || (exports.ReferencesRequest = {}))
		);
		let DocumentHighlightRequest;
		(function (DocumentHighlightRequest2) {
			DocumentHighlightRequest2.method = 'textDocument/documentHighlight';
			DocumentHighlightRequest2.type = new messages_1.ProtocolRequestType(
				DocumentHighlightRequest2.method
			);
		})(
			(DocumentHighlightRequest =
				exports.DocumentHighlightRequest ||
				(exports.DocumentHighlightRequest = {}))
		);
		let DocumentSymbolRequest;
		(function (DocumentSymbolRequest2) {
			DocumentSymbolRequest2.method = 'textDocument/documentSymbol';
			DocumentSymbolRequest2.type = new messages_1.ProtocolRequestType(
				DocumentSymbolRequest2.method
			);
		})(
			(DocumentSymbolRequest =
				exports.DocumentSymbolRequest || (exports.DocumentSymbolRequest = {}))
		);
		let CodeActionRequest;
		(function (CodeActionRequest2) {
			CodeActionRequest2.method = 'textDocument/codeAction';
			CodeActionRequest2.type = new messages_1.ProtocolRequestType(
				CodeActionRequest2.method
			);
		})(
			(CodeActionRequest =
				exports.CodeActionRequest || (exports.CodeActionRequest = {}))
		);
		let CodeActionResolveRequest;
		(function (CodeActionResolveRequest2) {
			CodeActionResolveRequest2.method = 'codeAction/resolve';
			CodeActionResolveRequest2.type = new messages_1.ProtocolRequestType(
				CodeActionResolveRequest2.method
			);
		})(
			(CodeActionResolveRequest =
				exports.CodeActionResolveRequest ||
				(exports.CodeActionResolveRequest = {}))
		);
		let WorkspaceSymbolRequest;
		(function (WorkspaceSymbolRequest2) {
			WorkspaceSymbolRequest2.method = 'workspace/symbol';
			WorkspaceSymbolRequest2.type = new messages_1.ProtocolRequestType(
				WorkspaceSymbolRequest2.method
			);
		})(
			(WorkspaceSymbolRequest =
				exports.WorkspaceSymbolRequest || (exports.WorkspaceSymbolRequest = {}))
		);
		let WorkspaceSymbolResolveRequest;
		(function (WorkspaceSymbolResolveRequest2) {
			WorkspaceSymbolResolveRequest2.method = 'workspaceSymbol/resolve';
			WorkspaceSymbolResolveRequest2.type = new messages_1.ProtocolRequestType(
				WorkspaceSymbolResolveRequest2.method
			);
		})(
			(WorkspaceSymbolResolveRequest =
				exports.WorkspaceSymbolResolveRequest ||
				(exports.WorkspaceSymbolResolveRequest = {}))
		);
		let CodeLensRequest;
		(function (CodeLensRequest2) {
			CodeLensRequest2.method = 'textDocument/codeLens';
			CodeLensRequest2.type = new messages_1.ProtocolRequestType(
				CodeLensRequest2.method
			);
		})(
			(CodeLensRequest =
				exports.CodeLensRequest || (exports.CodeLensRequest = {}))
		);
		let CodeLensResolveRequest;
		(function (CodeLensResolveRequest2) {
			CodeLensResolveRequest2.method = 'codeLens/resolve';
			CodeLensResolveRequest2.type = new messages_1.ProtocolRequestType(
				CodeLensResolveRequest2.method
			);
		})(
			(CodeLensResolveRequest =
				exports.CodeLensResolveRequest || (exports.CodeLensResolveRequest = {}))
		);
		let CodeLensRefreshRequest;
		(function (CodeLensRefreshRequest2) {
			CodeLensRefreshRequest2.method = `workspace/codeLens/refresh`;
			CodeLensRefreshRequest2.type = new messages_1.ProtocolRequestType0(
				CodeLensRefreshRequest2.method
			);
		})(
			(CodeLensRefreshRequest =
				exports.CodeLensRefreshRequest || (exports.CodeLensRefreshRequest = {}))
		);
		let DocumentLinkRequest;
		(function (DocumentLinkRequest2) {
			DocumentLinkRequest2.method = 'textDocument/documentLink';
			DocumentLinkRequest2.type = new messages_1.ProtocolRequestType(
				DocumentLinkRequest2.method
			);
		})(
			(DocumentLinkRequest =
				exports.DocumentLinkRequest || (exports.DocumentLinkRequest = {}))
		);
		let DocumentLinkResolveRequest;
		(function (DocumentLinkResolveRequest2) {
			DocumentLinkResolveRequest2.method = 'documentLink/resolve';
			DocumentLinkResolveRequest2.type = new messages_1.ProtocolRequestType(
				DocumentLinkResolveRequest2.method
			);
		})(
			(DocumentLinkResolveRequest =
				exports.DocumentLinkResolveRequest ||
				(exports.DocumentLinkResolveRequest = {}))
		);
		let DocumentFormattingRequest;
		(function (DocumentFormattingRequest2) {
			DocumentFormattingRequest2.method = 'textDocument/formatting';
			DocumentFormattingRequest2.type = new messages_1.ProtocolRequestType(
				DocumentFormattingRequest2.method
			);
		})(
			(DocumentFormattingRequest =
				exports.DocumentFormattingRequest ||
				(exports.DocumentFormattingRequest = {}))
		);
		let DocumentRangeFormattingRequest;
		(function (DocumentRangeFormattingRequest2) {
			DocumentRangeFormattingRequest2.method = 'textDocument/rangeFormatting';
			DocumentRangeFormattingRequest2.type = new messages_1.ProtocolRequestType(
				DocumentRangeFormattingRequest2.method
			);
		})(
			(DocumentRangeFormattingRequest =
				exports.DocumentRangeFormattingRequest ||
				(exports.DocumentRangeFormattingRequest = {}))
		);
		let DocumentOnTypeFormattingRequest;
		(function (DocumentOnTypeFormattingRequest2) {
			DocumentOnTypeFormattingRequest2.method = 'textDocument/onTypeFormatting';
			DocumentOnTypeFormattingRequest2.type = new messages_1.ProtocolRequestType(
				DocumentOnTypeFormattingRequest2.method
			);
		})(
			(DocumentOnTypeFormattingRequest =
				exports.DocumentOnTypeFormattingRequest ||
				(exports.DocumentOnTypeFormattingRequest = {}))
		);
		let PrepareSupportDefaultBehavior;
		(function (PrepareSupportDefaultBehavior2) {
			PrepareSupportDefaultBehavior2.Identifier = 1;
		})(
			(PrepareSupportDefaultBehavior =
				exports.PrepareSupportDefaultBehavior ||
				(exports.PrepareSupportDefaultBehavior = {}))
		);
		let RenameRequest;
		(function (RenameRequest2) {
			RenameRequest2.method = 'textDocument/rename';
			RenameRequest2.type = new messages_1.ProtocolRequestType(
				RenameRequest2.method
			);
		})((RenameRequest = exports.RenameRequest || (exports.RenameRequest = {})));
		let PrepareRenameRequest;
		(function (PrepareRenameRequest2) {
			PrepareRenameRequest2.method = 'textDocument/prepareRename';
			PrepareRenameRequest2.type = new messages_1.ProtocolRequestType(
				PrepareRenameRequest2.method
			);
		})(
			(PrepareRenameRequest =
				exports.PrepareRenameRequest || (exports.PrepareRenameRequest = {}))
		);
		let ExecuteCommandRequest;
		(function (ExecuteCommandRequest2) {
			ExecuteCommandRequest2.type = new messages_1.ProtocolRequestType(
				'workspace/executeCommand'
			);
		})(
			(ExecuteCommandRequest =
				exports.ExecuteCommandRequest || (exports.ExecuteCommandRequest = {}))
		);
		let ApplyWorkspaceEditRequest;
		(function (ApplyWorkspaceEditRequest2) {
			ApplyWorkspaceEditRequest2.type = new messages_1.ProtocolRequestType(
				'workspace/applyEdit'
			);
		})(
			(ApplyWorkspaceEditRequest =
				exports.ApplyWorkspaceEditRequest ||
				(exports.ApplyWorkspaceEditRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/connection.js
let require_connection2 = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/connection.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.createProtocolConnection = void 0;
		let vscode_jsonrpc_1 = require_main();
		function createProtocolConnection(input, output, logger, options) {
			if (vscode_jsonrpc_1.ConnectionStrategy.is(options)) {
				options = { connectionStrategy: options };
			}
			return (0, vscode_jsonrpc_1.createMessageConnection)(
				input,
				output,
				logger,
				options
			);
		}
		exports.createProtocolConnection = createProtocolConnection;
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/proposed.diagnostic.js
let require_proposed_diagnostic = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/proposed.diagnostic.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.DiagnosticRefreshRequest = exports.WorkspaceDiagnosticRequest = exports.DocumentDiagnosticRequest = exports.DocumentDiagnosticReportKind = exports.DiagnosticServerCancellationData = void 0;
		let vscode_jsonrpc_1 = require_main();
		let Is2 = require_is2();
		let messages_1 = require_messages2();
		let DiagnosticServerCancellationData;
		(function (DiagnosticServerCancellationData2) {
			function is2(value) {
				const candidate = value;
				return candidate && Is2.boolean(candidate.retriggerRequest);
			}
			DiagnosticServerCancellationData2.is = is2;
		})(
			(DiagnosticServerCancellationData =
				exports.DiagnosticServerCancellationData ||
				(exports.DiagnosticServerCancellationData = {}))
		);
		let DocumentDiagnosticReportKind;
		(function (DocumentDiagnosticReportKind2) {
			DocumentDiagnosticReportKind2['full'] = 'full';
			DocumentDiagnosticReportKind2['unChanged'] = 'unChanged';
		})(
			(DocumentDiagnosticReportKind =
				exports.DocumentDiagnosticReportKind ||
				(exports.DocumentDiagnosticReportKind = {}))
		);
		let DocumentDiagnosticRequest;
		(function (DocumentDiagnosticRequest2) {
			DocumentDiagnosticRequest2.method = 'textDocument/diagnostic';
			DocumentDiagnosticRequest2.type = new messages_1.ProtocolRequestType(
				DocumentDiagnosticRequest2.method
			);
			DocumentDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
		})(
			(DocumentDiagnosticRequest =
				exports.DocumentDiagnosticRequest ||
				(exports.DocumentDiagnosticRequest = {}))
		);
		let WorkspaceDiagnosticRequest;
		(function (WorkspaceDiagnosticRequest2) {
			WorkspaceDiagnosticRequest2.method = 'workspace/diagnostic';
			WorkspaceDiagnosticRequest2.type = new messages_1.ProtocolRequestType(
				WorkspaceDiagnosticRequest2.method
			);
			WorkspaceDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
		})(
			(WorkspaceDiagnosticRequest =
				exports.WorkspaceDiagnosticRequest ||
				(exports.WorkspaceDiagnosticRequest = {}))
		);
		let DiagnosticRefreshRequest;
		(function (DiagnosticRefreshRequest2) {
			DiagnosticRefreshRequest2.method = `workspace/diagnostic/refresh`;
			DiagnosticRefreshRequest2.type = new messages_1.ProtocolRequestType0(
				DiagnosticRefreshRequest2.method
			);
		})(
			(DiagnosticRefreshRequest =
				exports.DiagnosticRefreshRequest ||
				(exports.DiagnosticRefreshRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/proposed.typeHierarchy.js
let require_proposed_typeHierarchy = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/proposed.typeHierarchy.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.TypeHierarchySubtypesRequest = exports.TypeHierarchySupertypesRequest = exports.TypeHierarchyPrepareRequest = void 0;
		let messages_1 = require_messages2();
		let TypeHierarchyPrepareRequest;
		(function (TypeHierarchyPrepareRequest2) {
			TypeHierarchyPrepareRequest2.method = 'textDocument/prepareTypeHierarchy';
			TypeHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(
				TypeHierarchyPrepareRequest2.method
			);
		})(
			(TypeHierarchyPrepareRequest =
				exports.TypeHierarchyPrepareRequest ||
				(exports.TypeHierarchyPrepareRequest = {}))
		);
		let TypeHierarchySupertypesRequest;
		(function (TypeHierarchySupertypesRequest2) {
			TypeHierarchySupertypesRequest2.method = 'typeHierarchy/supertypes';
			TypeHierarchySupertypesRequest2.type = new messages_1.ProtocolRequestType(
				TypeHierarchySupertypesRequest2.method
			);
		})(
			(TypeHierarchySupertypesRequest =
				exports.TypeHierarchySupertypesRequest ||
				(exports.TypeHierarchySupertypesRequest = {}))
		);
		let TypeHierarchySubtypesRequest;
		(function (TypeHierarchySubtypesRequest2) {
			TypeHierarchySubtypesRequest2.method = 'typeHierarchy/subtypes';
			TypeHierarchySubtypesRequest2.type = new messages_1.ProtocolRequestType(
				TypeHierarchySubtypesRequest2.method
			);
		})(
			(TypeHierarchySubtypesRequest =
				exports.TypeHierarchySubtypesRequest ||
				(exports.TypeHierarchySubtypesRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/proposed.inlineValue.js
let require_proposed_inlineValue = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/proposed.inlineValue.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.InlineValuesRefreshRequest = exports.InlineValuesRequest = void 0;
		let messages_1 = require_messages2();
		let InlineValuesRequest;
		(function (InlineValuesRequest2) {
			InlineValuesRequest2.method = 'textDocument/inlineValues';
			InlineValuesRequest2.type = new messages_1.ProtocolRequestType(
				InlineValuesRequest2.method
			);
		})(
			(InlineValuesRequest =
				exports.InlineValuesRequest || (exports.InlineValuesRequest = {}))
		);
		let InlineValuesRefreshRequest;
		(function (InlineValuesRefreshRequest2) {
			InlineValuesRefreshRequest2.method = `workspace/inlineValues/refresh`;
			InlineValuesRefreshRequest2.type = new messages_1.ProtocolRequestType0(
				InlineValuesRefreshRequest2.method
			);
		})(
			(InlineValuesRefreshRequest =
				exports.InlineValuesRefreshRequest ||
				(exports.InlineValuesRefreshRequest = {}))
		);
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/common/api.js
let require_api2 = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/common/api.js'(
		exports
	) {
		'use strict';
		let __createBinding =
			(exports && exports.__createBinding) ||
			(Object.create
				? function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						Object.defineProperty(o, k2, {
							enumerable: true,
							get: function () {
								return m[k];
							},
						});
				  }
				: function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						o[k2] = m[k];
				  });
		let __exportStar =
			(exports && exports.__exportStar) ||
			function (m, exports2) {
				for (let p in m) {
					if (
						p !== 'default' &&
						!Object.prototype.hasOwnProperty.call(exports2, p)
					) {
						__createBinding(exports2, m, p);
					}
				}
			};
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.Proposed = exports.LSPErrorCodes = exports.createProtocolConnection = void 0;
		__exportStar(require_main(), exports);
		__exportStar(require_main2(), exports);
		__exportStar(require_messages2(), exports);
		__exportStar(require_protocol(), exports);
		let connection_1 = require_connection2();
		Object.defineProperty(exports, 'createProtocolConnection', {
			enumerable: true,
			get: function () {
				return connection_1.createProtocolConnection;
			},
		});
		let LSPErrorCodes;
		(function (LSPErrorCodes2) {
			LSPErrorCodes2.lspReservedErrorRangeStart = -32899;
			LSPErrorCodes2.RequestFailed = -32803;
			LSPErrorCodes2.ServerCancelled = -32802;
			LSPErrorCodes2.ContentModified = -32801;
			LSPErrorCodes2.RequestCancelled = -32800;
			LSPErrorCodes2.lspReservedErrorRangeEnd = -32800;
		})((LSPErrorCodes = exports.LSPErrorCodes || (exports.LSPErrorCodes = {})));
		let diag = require_proposed_diagnostic();
		let typeh = require_proposed_typeHierarchy();
		let iv = require_proposed_inlineValue();
		let Proposed;
		(function (Proposed2) {
			Proposed2.DiagnosticServerCancellationData =
				diag.DiagnosticServerCancellationData;
			Proposed2.DocumentDiagnosticReportKind =
				diag.DocumentDiagnosticReportKind;
			Proposed2.DocumentDiagnosticRequest = diag.DocumentDiagnosticRequest;
			Proposed2.WorkspaceDiagnosticRequest = diag.WorkspaceDiagnosticRequest;
			Proposed2.DiagnosticRefreshRequest = diag.DiagnosticRefreshRequest;
			Proposed2.TypeHierarchyPrepareRequest = typeh.TypeHierarchyPrepareRequest;
			Proposed2.TypeHierarchySupertypesRequest =
				typeh.TypeHierarchySupertypesRequest;
			Proposed2.TypeHierarchySubtypesRequest =
				typeh.TypeHierarchySubtypesRequest;
			Proposed2.InlineValuesRequest = iv.InlineValuesRequest;
			Proposed2.InlineValuesRefreshRequest = iv.InlineValuesRefreshRequest;
		})((Proposed = exports.Proposed || (exports.Proposed = {})));
	},
});

// client/node_modules/vscode-languageserver-protocol/lib/browser/main.js
let require_main3 = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/lib/browser/main.js'(
		exports
	) {
		'use strict';
		let __createBinding =
			(exports && exports.__createBinding) ||
			(Object.create
				? function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						Object.defineProperty(o, k2, {
							enumerable: true,
							get: function () {
								return m[k];
							},
						});
				  }
				: function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						o[k2] = m[k];
				  });
		let __exportStar =
			(exports && exports.__exportStar) ||
			function (m, exports2) {
				for (let p in m) {
					if (
						p !== 'default' &&
						!Object.prototype.hasOwnProperty.call(exports2, p)
					) {
						__createBinding(exports2, m, p);
					}
				}
			};
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.createProtocolConnection = void 0;
		let browser_1 = require_browser();
		__exportStar(require_browser(), exports);
		__exportStar(require_api2(), exports);
		function createProtocolConnection(reader, writer, logger, options) {
			return (0, browser_1.createMessageConnection)(
				reader,
				writer,
				logger,
				options
			);
		}
		exports.createProtocolConnection = createProtocolConnection;
	},
});

// client/node_modules/vscode-languageclient/lib/common/configuration.js
let require_configuration = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/configuration.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.toJSONObject = exports.ConfigurationFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let ConfigurationFeature = class {
			constructor(_client) {
				this._client = _client;
			}
			fillClientCapabilities(capabilities) {
				capabilities.workspace = capabilities.workspace || {};
				capabilities.workspace.configuration = true;
			}
			initialize() {
				let client = this._client;
				client.onRequest(
					vscode_languageserver_protocol_1.ConfigurationRequest.type,
					(params, token) => {
						let configuration = (params2) => {
							let result = [];
							for (let item of params2.items) {
								let resource =
									item.scopeUri !== void 0 && item.scopeUri !== null
										? this._client.protocol2CodeConverter.asUri(item.scopeUri)
										: void 0;
								result.push(
									this.getConfiguration(
										resource,
										item.section !== null ? item.section : void 0
									)
								);
							}
							return result;
						};
						let middleware = client.clientOptions.middleware.workspace;
						return middleware && middleware.configuration
							? middleware.configuration(params, token, configuration)
							: configuration(params, token);
					}
				);
			}
			getConfiguration(resource, section) {
				let result = null;
				if (section) {
					let index = section.lastIndexOf('.');
					if (index === -1) {
						result = toJSONObject(
							vscode_1.workspace.getConfiguration(void 0, resource).get(section)
						);
					} else {
						let config = vscode_1.workspace.getConfiguration(
							section.substr(0, index),
							resource
						);
						if (config) {
							result = toJSONObject(config.get(section.substr(index + 1)));
						}
					}
				} else {
					let config = vscode_1.workspace.getConfiguration(void 0, resource);
					result = {};
					for (let key of Object.keys(config)) {
						if (config.has(key)) {
							result[key] = toJSONObject(config.get(key));
						}
					}
				}
				if (result === void 0) {
					result = null;
				}
				return result;
			}
			dispose() {}
		};
		exports.ConfigurationFeature = ConfigurationFeature;
		function toJSONObject(obj) {
			if (obj) {
				if (Array.isArray(obj)) {
					return obj.map(toJSONObject);
				} else if (typeof obj === 'object') {
					const res = Object.create(null);
					for (const key in obj) {
						if (Object.prototype.hasOwnProperty.call(obj, key)) {
							res[key] = toJSONObject(obj[key]);
						}
					}
					return res;
				}
			}
			return obj;
		}
		exports.toJSONObject = toJSONObject;
	},
});

// client/node_modules/vscode-languageclient/lib/common/utils/is.js
let require_is3 = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/utils/is.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.asPromise = exports.thenable = exports.typedArray = exports.stringArray = exports.array = exports.func = exports.error = exports.number = exports.string = exports.boolean = void 0;
		function boolean(value) {
			return value === true || value === false;
		}
		exports.boolean = boolean;
		function string(value) {
			return typeof value === 'string' || value instanceof String;
		}
		exports.string = string;
		function number(value) {
			return typeof value === 'number' || value instanceof Number;
		}
		exports.number = number;
		function error(value) {
			return value instanceof Error;
		}
		exports.error = error;
		function func(value) {
			return typeof value === 'function';
		}
		exports.func = func;
		function array(value) {
			return Array.isArray(value);
		}
		exports.array = array;
		function stringArray(value) {
			return array(value) && value.every((elem) => string(elem));
		}
		exports.stringArray = stringArray;
		function typedArray(value, check) {
			return Array.isArray(value) && value.every(check);
		}
		exports.typedArray = typedArray;
		function thenable(value) {
			return value && func(value.then);
		}
		exports.thenable = thenable;
		function asPromise(value) {
			if (value instanceof Promise) {
				return value;
			} else if (thenable(value)) {
				return new Promise((resolve, reject) => {
					value.then(
						(resolved) => resolve(resolved),
						(error2) => reject(error2)
					);
				});
			} else {
				return Promise.resolve(value);
			}
		}
		exports.asPromise = asPromise;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolCompletionItem.js
let require_protocolCompletionItem = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolCompletionItem.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let code = require('vscode');
		let ProtocolCompletionItem = class extends code.CompletionItem {
			constructor(label) {
				super(label);
			}
		};
		exports.default = ProtocolCompletionItem;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolCodeLens.js
let require_protocolCodeLens = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolCodeLens.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let code = require('vscode');
		let ProtocolCodeLens = class extends code.CodeLens {
			constructor(range) {
				super(range);
			}
		};
		exports.default = ProtocolCodeLens;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolDocumentLink.js
let require_protocolDocumentLink = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolDocumentLink.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let code = require('vscode');
		let ProtocolDocumentLink = class extends code.DocumentLink {
			constructor(range, target) {
				super(range, target);
			}
		};
		exports.default = ProtocolDocumentLink;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolCodeAction.js
let require_protocolCodeAction = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolCodeAction.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let vscode3 = require('vscode');
		let ProtocolCodeAction = class extends vscode3.CodeAction {
			constructor(title, data) {
				super(title);
				this.data = data;
			}
		};
		exports.default = ProtocolCodeAction;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolDiagnostic.js
let require_protocolDiagnostic = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolDiagnostic.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ProtocolDiagnostic = exports.DiagnosticCode = void 0;
		let vscode3 = require('vscode');
		let Is2 = require_is3();
		let DiagnosticCode;
		(function (DiagnosticCode2) {
			function is2(value) {
				const candidate = value;
				return (
					candidate !== void 0 &&
					candidate !== null &&
					(Is2.number(candidate.value) || Is2.string(candidate.value)) &&
					Is2.string(candidate.target)
				);
			}
			DiagnosticCode2.is = is2;
		})(
			(DiagnosticCode = exports.DiagnosticCode || (exports.DiagnosticCode = {}))
		);
		let ProtocolDiagnostic = class extends vscode3.Diagnostic {
			constructor(range, message, severity, data) {
				super(range, message, severity);
				this.data = data;
				this.hasDiagnosticCode = false;
			}
		};
		exports.ProtocolDiagnostic = ProtocolDiagnostic;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolCallHierarchyItem.js
let require_protocolCallHierarchyItem = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolCallHierarchyItem.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let code = require('vscode');
		let ProtocolCallHierarchyItem = class extends code.CallHierarchyItem {
			constructor(kind, name, detail, uri, range, selectionRange, data) {
				super(kind, name, detail, uri, range, selectionRange);
				if (data !== void 0) {
					this.data = data;
				}
			}
		};
		exports.default = ProtocolCallHierarchyItem;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolTypeHierarchyItem.js
let require_protocolTypeHierarchyItem = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolTypeHierarchyItem.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let code = require('vscode');
		let ProtocolTypeHierarchyItem = class extends code.TypeHierarchyItem {
			constructor(kind, name, detail, uri, range, selectionRange, data) {
				super(kind, name, detail, uri, range, selectionRange);
				if (data !== void 0) {
					this.data = data;
				}
			}
		};
		exports.default = ProtocolTypeHierarchyItem;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolWorkspaceSymbol.js
let require_protocolWorkspaceSymbol = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolWorkspaceSymbol.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		let code = require('vscode');
		let WorkspaceSymbol = class extends code.SymbolInformation {
			constructor(name, kind, containerName, locationOrUri, data) {
				const hasRange = !(locationOrUri instanceof code.Uri);
				super(
					name,
					kind,
					containerName,
					hasRange
						? locationOrUri
						: new code.Location(locationOrUri, new code.Range(0, 0, 0, 0))
				);
				this.hasRange = hasRange;
				if (data !== void 0) {
					this.data = data;
				}
			}
		};
		exports.default = WorkspaceSymbol;
	},
});

// client/node_modules/vscode-languageclient/lib/common/codeConverter.js
let require_codeConverter = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/codeConverter.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.createConverter = void 0;
		let code = require('vscode');
		let proto = require_main3();
		let Is2 = require_is3();
		let protocolCompletionItem_1 = require_protocolCompletionItem();
		let protocolCodeLens_1 = require_protocolCodeLens();
		let protocolDocumentLink_1 = require_protocolDocumentLink();
		let protocolCodeAction_1 = require_protocolCodeAction();
		let protocolDiagnostic_1 = require_protocolDiagnostic();
		let protocolCallHierarchyItem_1 = require_protocolCallHierarchyItem();
		let vscode_languageserver_protocol_1 = require_main3();
		let protocolTypeHierarchyItem_1 = require_protocolTypeHierarchyItem();
		let protocolWorkspaceSymbol_1 = require_protocolWorkspaceSymbol();
		let InsertReplaceRange;
		(function (InsertReplaceRange2) {
			function is2(value) {
				const candidate = value;
				return candidate && !!candidate.inserting && !!candidate.replacing;
			}
			InsertReplaceRange2.is = is2;
		})(InsertReplaceRange || (InsertReplaceRange = {}));
		function createConverter(uriConverter) {
			const nullConverter = (value) => value.toString();
			const _uriConverter = uriConverter || nullConverter;
			function asUri(value) {
				return _uriConverter(value);
			}
			function asTextDocumentIdentifier(textDocument) {
				return {
					uri: _uriConverter(textDocument.uri),
				};
			}
			function asVersionedTextDocumentIdentifier(textDocument) {
				return {
					uri: _uriConverter(textDocument.uri),
					version: textDocument.version,
				};
			}
			function asOpenTextDocumentParams(textDocument) {
				return {
					textDocument: {
						uri: _uriConverter(textDocument.uri),
						languageId: textDocument.languageId,
						version: textDocument.version,
						text: textDocument.getText(),
					},
				};
			}
			function isTextDocumentChangeEvent(value) {
				let candidate = value;
				return !!candidate.document && !!candidate.contentChanges;
			}
			function isTextDocument(value) {
				let candidate = value;
				return !!candidate.uri && !!candidate.version;
			}
			function asChangeTextDocumentParams(arg) {
				if (isTextDocument(arg)) {
					let result = {
						textDocument: {
							uri: _uriConverter(arg.uri),
							version: arg.version,
						},
						contentChanges: [{ text: arg.getText() }],
					};
					return result;
				} else if (isTextDocumentChangeEvent(arg)) {
					let document2 = arg.document;
					let result = {
						textDocument: {
							uri: _uriConverter(document2.uri),
							version: document2.version,
						},
						contentChanges: arg.contentChanges.map((change) => {
							let range = change.range;
							return {
								range: {
									start: {
										line: range.start.line,
										character: range.start.character,
									},
									end: { line: range.end.line, character: range.end.character },
								},
								rangeLength: change.rangeLength,
								text: change.text,
							};
						}),
					};
					return result;
				} else {
					throw Error('Unsupported text document change parameter');
				}
			}
			function asCloseTextDocumentParams(textDocument) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
				};
			}
			function asSaveTextDocumentParams(textDocument, includeContent = false) {
				let result = {
					textDocument: asTextDocumentIdentifier(textDocument),
				};
				if (includeContent) {
					result.text = textDocument.getText();
				}
				return result;
			}
			function asTextDocumentSaveReason(reason) {
				switch (reason) {
					case code.TextDocumentSaveReason.Manual:
						return proto.TextDocumentSaveReason.Manual;
					case code.TextDocumentSaveReason.AfterDelay:
						return proto.TextDocumentSaveReason.AfterDelay;
					case code.TextDocumentSaveReason.FocusOut:
						return proto.TextDocumentSaveReason.FocusOut;
				}
				return proto.TextDocumentSaveReason.Manual;
			}
			function asWillSaveTextDocumentParams(event) {
				return {
					textDocument: asTextDocumentIdentifier(event.document),
					reason: asTextDocumentSaveReason(event.reason),
				};
			}
			function asDidCreateFilesParams(event) {
				return {
					files: event.files.map((fileUri) => ({
						uri: _uriConverter(fileUri),
					})),
				};
			}
			function asDidRenameFilesParams(event) {
				return {
					files: event.files.map((file) => ({
						oldUri: _uriConverter(file.oldUri),
						newUri: _uriConverter(file.newUri),
					})),
				};
			}
			function asDidDeleteFilesParams(event) {
				return {
					files: event.files.map((fileUri) => ({
						uri: _uriConverter(fileUri),
					})),
				};
			}
			function asWillCreateFilesParams(event) {
				return {
					files: event.files.map((fileUri) => ({
						uri: _uriConverter(fileUri),
					})),
				};
			}
			function asWillRenameFilesParams(event) {
				return {
					files: event.files.map((file) => ({
						oldUri: _uriConverter(file.oldUri),
						newUri: _uriConverter(file.newUri),
					})),
				};
			}
			function asWillDeleteFilesParams(event) {
				return {
					files: event.files.map((fileUri) => ({
						uri: _uriConverter(fileUri),
					})),
				};
			}
			function asTextDocumentPositionParams(textDocument, position) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
					position: asWorkerPosition(position),
				};
			}
			function asCompletionTriggerKind(triggerKind) {
				switch (triggerKind) {
					case code.CompletionTriggerKind.TriggerCharacter:
						return proto.CompletionTriggerKind.TriggerCharacter;
					case code.CompletionTriggerKind.TriggerForIncompleteCompletions:
						return proto.CompletionTriggerKind.TriggerForIncompleteCompletions;
					default:
						return proto.CompletionTriggerKind.Invoked;
				}
			}
			function asCompletionParams(textDocument, position, context) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
					position: asWorkerPosition(position),
					context: {
						triggerKind: asCompletionTriggerKind(context.triggerKind),
						triggerCharacter: context.triggerCharacter,
					},
				};
			}
			function asSignatureHelpTriggerKind(triggerKind) {
				switch (triggerKind) {
					case code.SignatureHelpTriggerKind.Invoke:
						return proto.SignatureHelpTriggerKind.Invoked;
					case code.SignatureHelpTriggerKind.TriggerCharacter:
						return proto.SignatureHelpTriggerKind.TriggerCharacter;
					case code.SignatureHelpTriggerKind.ContentChange:
						return proto.SignatureHelpTriggerKind.ContentChange;
				}
			}
			function asParameterInformation(value) {
				return {
					label: value.label,
				};
			}
			function asParameterInformations(values) {
				return values.map(asParameterInformation);
			}
			function asSignatureInformation(value) {
				return {
					label: value.label,
					parameters: asParameterInformations(value.parameters),
				};
			}
			function asSignatureInformations(values) {
				return values.map(asSignatureInformation);
			}
			function asSignatureHelp(value) {
				if (value === void 0) {
					return value;
				}
				return {
					signatures: asSignatureInformations(value.signatures),
					activeSignature: value.activeSignature,
					activeParameter: value.activeParameter,
				};
			}
			function asSignatureHelpParams(textDocument, position, context) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
					position: asWorkerPosition(position),
					context: {
						isRetrigger: context.isRetrigger,
						triggerCharacter: context.triggerCharacter,
						triggerKind: asSignatureHelpTriggerKind(context.triggerKind),
						activeSignatureHelp: asSignatureHelp(context.activeSignatureHelp),
					},
				};
			}
			function asWorkerPosition(position) {
				return { line: position.line, character: position.character };
			}
			function asPosition(value) {
				if (value === void 0 || value === null) {
					return value;
				}
				return {
					line:
						value.line > vscode_languageserver_protocol_1.uinteger.MAX_VALUE
							? vscode_languageserver_protocol_1.uinteger.MAX_VALUE
							: value.line,
					character:
						value.character >
						vscode_languageserver_protocol_1.uinteger.MAX_VALUE
							? vscode_languageserver_protocol_1.uinteger.MAX_VALUE
							: value.character,
				};
			}
			function asPositions(value) {
				let result = [];
				for (let elem of value) {
					result.push(asPosition(elem));
				}
				return result;
			}
			function asRange(value) {
				if (value === void 0 || value === null) {
					return value;
				}
				return { start: asPosition(value.start), end: asPosition(value.end) };
			}
			function asLocation(value) {
				if (value === void 0 || value === null) {
					return value;
				}
				return proto.Location.create(asUri(value.uri), asRange(value.range));
			}
			function asDiagnosticSeverity(value) {
				switch (value) {
					case code.DiagnosticSeverity.Error:
						return proto.DiagnosticSeverity.Error;
					case code.DiagnosticSeverity.Warning:
						return proto.DiagnosticSeverity.Warning;
					case code.DiagnosticSeverity.Information:
						return proto.DiagnosticSeverity.Information;
					case code.DiagnosticSeverity.Hint:
						return proto.DiagnosticSeverity.Hint;
				}
			}
			function asDiagnosticTags(tags) {
				if (!tags) {
					return void 0;
				}
				let result = [];
				for (let tag of tags) {
					let converted = asDiagnosticTag(tag);
					if (converted !== void 0) {
						result.push(converted);
					}
				}
				return result.length > 0 ? result : void 0;
			}
			function asDiagnosticTag(tag) {
				switch (tag) {
					case code.DiagnosticTag.Unnecessary:
						return proto.DiagnosticTag.Unnecessary;
					case code.DiagnosticTag.Deprecated:
						return proto.DiagnosticTag.Deprecated;
					default:
						return void 0;
				}
			}
			function asRelatedInformation(item) {
				return {
					message: item.message,
					location: asLocation(item.location),
				};
			}
			function asRelatedInformations(items) {
				return items.map(asRelatedInformation);
			}
			function asDiagnosticCode(value) {
				if (value === void 0 || value === null) {
					return void 0;
				}
				if (Is2.number(value) || Is2.string(value)) {
					return value;
				}
				return { value: value.value, target: asUri(value.target) };
			}
			function asDiagnostic(item) {
				const result = proto.Diagnostic.create(
					asRange(item.range),
					item.message
				);
				const protocolDiagnostic =
					item instanceof protocolDiagnostic_1.ProtocolDiagnostic
						? item
						: void 0;
				if (
					protocolDiagnostic !== void 0 &&
					protocolDiagnostic.data !== void 0
				) {
					result.data = protocolDiagnostic.data;
				}
				const code2 = asDiagnosticCode(item.code);
				if (protocolDiagnostic_1.DiagnosticCode.is(code2)) {
					if (
						protocolDiagnostic !== void 0 &&
						protocolDiagnostic.hasDiagnosticCode
					) {
						result.code = code2;
					} else {
						result.code = code2.value;
						result.codeDescription = { href: code2.target };
					}
				} else {
					result.code = code2;
				}
				if (Is2.number(item.severity)) {
					result.severity = asDiagnosticSeverity(item.severity);
				}
				if (Array.isArray(item.tags)) {
					result.tags = asDiagnosticTags(item.tags);
				}
				if (item.relatedInformation) {
					result.relatedInformation = asRelatedInformations(
						item.relatedInformation
					);
				}
				if (item.source) {
					result.source = item.source;
				}
				return result;
			}
			function asDiagnostics(items) {
				if (items === void 0 || items === null) {
					return items;
				}
				return items.map(asDiagnostic);
			}
			function asDocumentation(format, documentation) {
				switch (format) {
					case '$string':
						return documentation;
					case proto.MarkupKind.PlainText:
						return { kind: format, value: documentation };
					case proto.MarkupKind.Markdown:
						return { kind: format, value: documentation.value };
					default:
						return `Unsupported Markup content received. Kind is: ${format}`;
				}
			}
			function asCompletionItemTag(tag) {
				switch (tag) {
					case code.CompletionItemTag.Deprecated:
						return proto.CompletionItemTag.Deprecated;
				}
				return void 0;
			}
			function asCompletionItemTags(tags) {
				if (tags === void 0) {
					return tags;
				}
				const result = [];
				for (let tag of tags) {
					const converted = asCompletionItemTag(tag);
					if (converted !== void 0) {
						result.push(converted);
					}
				}
				return result;
			}
			function asCompletionItemKind(value, original) {
				if (original !== void 0) {
					return original;
				}
				return value + 1;
			}
			function asCompletionItem(item, labelDetailsSupport = false) {
				let label;
				let labelDetails;
				if (Is2.string(item.label)) {
					label = item.label;
				} else {
					label = item.label.label;
					if (
						labelDetailsSupport &&
						(item.label.detail !== void 0 || item.label.description !== void 0)
					) {
						labelDetails = {
							detail: item.label.detail,
							description: item.label.description,
						};
					}
				}
				let result = { label };
				if (labelDetails !== void 0) {
					result.labelDetails = labelDetails;
				}
				let protocolItem =
					item instanceof protocolCompletionItem_1.default ? item : void 0;
				if (item.detail) {
					result.detail = item.detail;
				}
				if (item.documentation) {
					if (!protocolItem || protocolItem.documentationFormat === '$string') {
						result.documentation = item.documentation;
					} else {
						result.documentation = asDocumentation(
							protocolItem.documentationFormat,
							item.documentation
						);
					}
				}
				if (item.filterText) {
					result.filterText = item.filterText;
				}
				fillPrimaryInsertText(result, item);
				if (Is2.number(item.kind)) {
					result.kind = asCompletionItemKind(
						item.kind,
						protocolItem && protocolItem.originalItemKind
					);
				}
				if (item.sortText) {
					result.sortText = item.sortText;
				}
				if (item.additionalTextEdits) {
					result.additionalTextEdits = asTextEdits(item.additionalTextEdits);
				}
				if (item.commitCharacters) {
					result.commitCharacters = item.commitCharacters.slice();
				}
				if (item.command) {
					result.command = asCommand(item.command);
				}
				if (item.preselect === true || item.preselect === false) {
					result.preselect = item.preselect;
				}
				const tags = asCompletionItemTags(item.tags);
				if (protocolItem) {
					if (protocolItem.data !== void 0) {
						result.data = protocolItem.data;
					}
					if (
						protocolItem.deprecated === true ||
						protocolItem.deprecated === false
					) {
						if (
							protocolItem.deprecated === true &&
							tags !== void 0 &&
							tags.length > 0
						) {
							const index = tags.indexOf(code.CompletionItemTag.Deprecated);
							if (index !== -1) {
								tags.splice(index, 1);
							}
						}
						result.deprecated = protocolItem.deprecated;
					}
					if (protocolItem.insertTextMode !== void 0) {
						result.insertTextMode = protocolItem.insertTextMode;
					}
				}
				if (tags !== void 0 && tags.length > 0) {
					result.tags = tags;
				}
				if (result.insertTextMode === void 0 && item.keepWhitespace === true) {
					result.insertTextMode =
						vscode_languageserver_protocol_1.InsertTextMode.adjustIndentation;
				}
				return result;
			}
			function fillPrimaryInsertText(target, source) {
				let format = proto.InsertTextFormat.PlainText;
				let text = void 0;
				let range = void 0;
				if (source.textEdit) {
					text = source.textEdit.newText;
					range = source.textEdit.range;
				} else if (source.insertText instanceof code.SnippetString) {
					format = proto.InsertTextFormat.Snippet;
					text = source.insertText.value;
				} else {
					text = source.insertText;
				}
				if (source.range) {
					range = source.range;
				}
				target.insertTextFormat = format;
				if (source.fromEdit && text !== void 0 && range !== void 0) {
					target.textEdit = asCompletionTextEdit(text, range);
				} else {
					target.insertText = text;
				}
			}
			function asCompletionTextEdit(newText, range) {
				if (InsertReplaceRange.is(range)) {
					return proto.InsertReplaceEdit.create(
						newText,
						asRange(range.inserting),
						asRange(range.replacing)
					);
				} else {
					return { newText, range: asRange(range) };
				}
			}
			function asTextEdit(edit) {
				return { range: asRange(edit.range), newText: edit.newText };
			}
			function asTextEdits(edits) {
				if (edits === void 0 || edits === null) {
					return edits;
				}
				return edits.map(asTextEdit);
			}
			function asSymbolKind(item) {
				if (item <= code.SymbolKind.TypeParameter) {
					return item + 1;
				}
				return proto.SymbolKind.Property;
			}
			function asSymbolTag(item) {
				return item;
			}
			function asSymbolTags(items) {
				return items.map(asSymbolTag);
			}
			function asReferenceParams(textDocument, position, options) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
					position: asWorkerPosition(position),
					context: { includeDeclaration: options.includeDeclaration },
				};
			}
			function asCodeAction(item) {
				let result = proto.CodeAction.create(item.title);
				if (
					item instanceof protocolCodeAction_1.default &&
					item.data !== void 0
				) {
					result.data = item.data;
				}
				if (item.kind !== void 0) {
					result.kind = asCodeActionKind(item.kind);
				}
				if (item.diagnostics !== void 0) {
					result.diagnostics = asDiagnostics(item.diagnostics);
				}
				if (item.edit !== void 0) {
					throw new Error(
						`VS Code code actions can only be converted to a protocol code action without an edit.`
					);
				}
				if (item.command !== void 0) {
					result.command = asCommand(item.command);
				}
				if (item.isPreferred !== void 0) {
					result.isPreferred = item.isPreferred;
				}
				if (item.disabled !== void 0) {
					result.disabled = { reason: item.disabled.reason };
				}
				return result;
			}
			function asCodeActionContext(context) {
				if (context === void 0 || context === null) {
					return context;
				}
				let only;
				if (context.only && Is2.string(context.only.value)) {
					only = [context.only.value];
				}
				return proto.CodeActionContext.create(
					asDiagnostics(context.diagnostics),
					only,
					asCodeActionTriggerKind(context.triggerKind)
				);
			}
			function asCodeActionTriggerKind(kind) {
				switch (kind) {
					case code.CodeActionTriggerKind.Invoke:
						return proto.CodeActionTriggerKind.Invoked;
					case code.CodeActionTriggerKind.Automatic:
						return proto.CodeActionTriggerKind.Automatic;
					default:
						return void 0;
				}
			}
			function asCodeActionKind(item) {
				if (item === void 0 || item === null) {
					return void 0;
				}
				return item.value;
			}
			function asInlineValuesContext(context) {
				if (context === void 0 || context === null) {
					return context;
				}
				return proto.InlineValuesContext.create(context.stoppedLocation);
			}
			function asCommand(item) {
				let result = proto.Command.create(item.title, item.command);
				if (item.arguments) {
					result.arguments = item.arguments;
				}
				return result;
			}
			function asCodeLens(item) {
				let result = proto.CodeLens.create(asRange(item.range));
				if (item.command) {
					result.command = asCommand(item.command);
				}
				if (item instanceof protocolCodeLens_1.default) {
					if (item.data) {
						result.data = item.data;
					}
				}
				return result;
			}
			function asFormattingOptions(options, fileOptions) {
				const result = {
					tabSize: options.tabSize,
					insertSpaces: options.insertSpaces,
				};
				if (fileOptions.trimTrailingWhitespace) {
					result.trimTrailingWhitespace = true;
				}
				if (fileOptions.trimFinalNewlines) {
					result.trimFinalNewlines = true;
				}
				if (fileOptions.insertFinalNewline) {
					result.insertFinalNewline = true;
				}
				return result;
			}
			function asDocumentSymbolParams(textDocument) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
				};
			}
			function asCodeLensParams(textDocument) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
				};
			}
			function asDocumentLink(item) {
				let result = proto.DocumentLink.create(asRange(item.range));
				if (item.target) {
					result.target = asUri(item.target);
				}
				if (item.tooltip !== void 0) {
					result.tooltip = item.tooltip;
				}
				let protocolItem =
					item instanceof protocolDocumentLink_1.default ? item : void 0;
				if (protocolItem && protocolItem.data) {
					result.data = protocolItem.data;
				}
				return result;
			}
			function asDocumentLinkParams(textDocument) {
				return {
					textDocument: asTextDocumentIdentifier(textDocument),
				};
			}
			function asCallHierarchyItem(value) {
				const result = {
					name: value.name,
					kind: asSymbolKind(value.kind),
					uri: asUri(value.uri),
					range: asRange(value.range),
					selectionRange: asRange(value.selectionRange),
				};
				if (value.detail !== void 0 && value.detail.length > 0) {
					result.detail = value.detail;
				}
				if (value.tags !== void 0) {
					result.tags = asSymbolTags(value.tags);
				}
				if (
					value instanceof protocolCallHierarchyItem_1.default &&
					value.data !== void 0
				) {
					result.data = value.data;
				}
				return result;
			}
			function asTypeHierarchyItem(value) {
				const result = {
					name: value.name,
					kind: asSymbolKind(value.kind),
					uri: asUri(value.uri),
					range: asRange(value.range),
					selectionRange: asRange(value.selectionRange),
				};
				if (value.detail !== void 0 && value.detail.length > 0) {
					result.detail = value.detail;
				}
				if (value.tags !== void 0) {
					result.tags = asSymbolTags(value.tags);
				}
				if (
					value instanceof protocolTypeHierarchyItem_1.default &&
					value.data !== void 0
				) {
					result.data = value.data;
				}
				return result;
			}
			function asWorkspaceSymbol(item) {
				const result =
					item instanceof protocolWorkspaceSymbol_1.default
						? {
								name: item.name,
								kind: asSymbolKind(item.kind),
								location: item.hasRange
									? asLocation(item.location)
									: { uri: _uriConverter(item.location.uri) },
								data: item.data,
						  }
						: {
								name: item.name,
								kind: asSymbolKind(item.kind),
								location: asLocation(item.location),
						  };
				if (item.tags !== void 0) {
					result.tags = asSymbolTags(item.tags);
				}
				if (item.containerName !== '') {
					result.containerName = item.containerName;
				}
				return result;
			}
			return {
				asUri,
				asTextDocumentIdentifier,
				asVersionedTextDocumentIdentifier,
				asOpenTextDocumentParams,
				asChangeTextDocumentParams,
				asCloseTextDocumentParams,
				asSaveTextDocumentParams,
				asWillSaveTextDocumentParams,
				asDidCreateFilesParams,
				asDidRenameFilesParams,
				asDidDeleteFilesParams,
				asWillCreateFilesParams,
				asWillRenameFilesParams,
				asWillDeleteFilesParams,
				asTextDocumentPositionParams,
				asCompletionParams,
				asSignatureHelpParams,
				asWorkerPosition,
				asRange,
				asPosition,
				asPositions,
				asLocation,
				asDiagnosticSeverity,
				asDiagnosticTag,
				asDiagnostic,
				asDiagnostics,
				asCompletionItem,
				asTextEdit,
				asSymbolKind,
				asSymbolTag,
				asSymbolTags,
				asReferenceParams,
				asCodeAction,
				asCodeActionContext,
				asInlineValuesContext,
				asCommand,
				asCodeLens,
				asFormattingOptions,
				asDocumentSymbolParams,
				asCodeLensParams,
				asDocumentLink,
				asDocumentLinkParams,
				asCallHierarchyItem,
				asTypeHierarchyItem,
				asWorkspaceSymbol,
			};
		}
		exports.createConverter = createConverter;
	},
});

// client/node_modules/vscode-languageclient/lib/common/protocolConverter.js
let require_protocolConverter = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/protocolConverter.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.createConverter = void 0;
		let code = require('vscode');
		let ls2 = require_main3();
		let Is2 = require_is3();
		let protocolCompletionItem_1 = require_protocolCompletionItem();
		let protocolCodeLens_1 = require_protocolCodeLens();
		let protocolDocumentLink_1 = require_protocolDocumentLink();
		let protocolCodeAction_1 = require_protocolCodeAction();
		let protocolDiagnostic_1 = require_protocolDiagnostic();
		let protocolCallHierarchyItem_1 = require_protocolCallHierarchyItem();
		let vscode_languageserver_protocol_1 = require_main3();
		let protocolTypeHierarchyItem_1 = require_protocolTypeHierarchyItem();
		let protocolWorkspaceSymbol_1 = require_protocolWorkspaceSymbol();
		let CodeBlock;
		(function (CodeBlock2) {
			function is2(value) {
				let candidate = value;
				return (
					candidate &&
					Is2.string(candidate.language) &&
					Is2.string(candidate.value)
				);
			}
			CodeBlock2.is = is2;
		})(CodeBlock || (CodeBlock = {}));
		function createConverter(uriConverter, trustMarkdown, supportHtml) {
			const nullConverter = (value) => code.Uri.parse(value);
			const _uriConverter = uriConverter || nullConverter;
			function asUri(value) {
				return _uriConverter(value);
			}
			function asDiagnostics(diagnostics) {
				return diagnostics.map(asDiagnostic);
			}
			function asDiagnostic(diagnostic) {
				let result = new protocolDiagnostic_1.ProtocolDiagnostic(
					asRange(diagnostic.range),
					diagnostic.message,
					asDiagnosticSeverity(diagnostic.severity),
					diagnostic.data
				);
				if (diagnostic.code !== void 0) {
					if (ls2.CodeDescription.is(diagnostic.codeDescription)) {
						result.code = {
							value: diagnostic.code,
							target: asUri(diagnostic.codeDescription.href),
						};
					} else if (protocolDiagnostic_1.DiagnosticCode.is(diagnostic.code)) {
						result.hasDiagnosticCode = true;
						result.code = {
							value: diagnostic.code.value,
							target: asUri(diagnostic.code.target),
						};
					} else {
						result.code = diagnostic.code;
					}
				}
				if (diagnostic.source) {
					result.source = diagnostic.source;
				}
				if (diagnostic.relatedInformation) {
					result.relatedInformation = asRelatedInformation(
						diagnostic.relatedInformation
					);
				}
				if (Array.isArray(diagnostic.tags)) {
					result.tags = asDiagnosticTags(diagnostic.tags);
				}
				return result;
			}
			function asRelatedInformation(relatedInformation) {
				return relatedInformation.map(asDiagnosticRelatedInformation);
			}
			function asDiagnosticRelatedInformation(information) {
				return new code.DiagnosticRelatedInformation(
					asLocation(information.location),
					information.message
				);
			}
			function asDiagnosticTags(tags) {
				if (!tags) {
					return void 0;
				}
				let result = [];
				for (let tag of tags) {
					let converted = asDiagnosticTag(tag);
					if (converted !== void 0) {
						result.push(converted);
					}
				}
				return result.length > 0 ? result : void 0;
			}
			function asDiagnosticTag(tag) {
				switch (tag) {
					case ls2.DiagnosticTag.Unnecessary:
						return code.DiagnosticTag.Unnecessary;
					case ls2.DiagnosticTag.Deprecated:
						return code.DiagnosticTag.Deprecated;
					default:
						return void 0;
				}
			}
			function asPosition(value) {
				if (!value) {
					return void 0;
				}
				return new code.Position(value.line, value.character);
			}
			function asRange(value) {
				if (!value) {
					return void 0;
				}
				return new code.Range(asPosition(value.start), asPosition(value.end));
			}
			function asRanges(value) {
				return value.map((value2) => asRange(value2));
			}
			function asDiagnosticSeverity(value) {
				if (value === void 0 || value === null) {
					return code.DiagnosticSeverity.Error;
				}
				switch (value) {
					case ls2.DiagnosticSeverity.Error:
						return code.DiagnosticSeverity.Error;
					case ls2.DiagnosticSeverity.Warning:
						return code.DiagnosticSeverity.Warning;
					case ls2.DiagnosticSeverity.Information:
						return code.DiagnosticSeverity.Information;
					case ls2.DiagnosticSeverity.Hint:
						return code.DiagnosticSeverity.Hint;
				}
				return code.DiagnosticSeverity.Error;
			}
			function asHoverContent(value) {
				if (Is2.string(value)) {
					return asMarkdownString(value);
				} else if (CodeBlock.is(value)) {
					let result = asMarkdownString();
					return result.appendCodeblock(value.value, value.language);
				} else if (Array.isArray(value)) {
					let result = [];
					for (let element of value) {
						let item = asMarkdownString();
						if (CodeBlock.is(element)) {
							item.appendCodeblock(element.value, element.language);
						} else {
							item.appendMarkdown(element);
						}
						result.push(item);
					}
					return result;
				} else {
					let result;
					switch (value.kind) {
						case ls2.MarkupKind.Markdown:
							return asMarkdownString(value.value);
						case ls2.MarkupKind.PlainText:
							result = asMarkdownString();
							result.appendText(value.value);
							return result;
						default:
							result = asMarkdownString();
							result.appendText(
								`Unsupported Markup content received. Kind is: ${value.kind}`
							);
							return result;
					}
				}
			}
			function asDocumentation(value) {
				if (Is2.string(value)) {
					return value;
				} else {
					switch (value.kind) {
						case ls2.MarkupKind.Markdown:
							return asMarkdownString(value.value);
						case ls2.MarkupKind.PlainText:
							return value.value;
						default:
							return `Unsupported Markup content received. Kind is: ${value.kind}`;
					}
				}
			}
			function asMarkdownString(value) {
				const result = new code.MarkdownString(value);
				result.isTrusted = trustMarkdown;
				result.supportHtml = supportHtml;
				return result;
			}
			function asHover(hover) {
				if (!hover) {
					return void 0;
				}
				return new code.Hover(
					asHoverContent(hover.contents),
					asRange(hover.range)
				);
			}
			function asCompletionResult(result, allCommitCharacters) {
				if (!result) {
					return void 0;
				}
				if (Array.isArray(result)) {
					let items = result;
					return items.map((item) =>
						asCompletionItem(item, allCommitCharacters)
					);
				}
				const list = result;
				const rangeDefaults = list.itemDefaults?.editRange;
				const [range, inserting, replacing] = ls2.Range.is(rangeDefaults)
					? [asRange(rangeDefaults), void 0, void 0]
					: rangeDefaults !== void 0
					? [
							void 0,
							asRange(rangeDefaults.insert),
							asRange(rangeDefaults.replace),
					  ]
					: [void 0, void 0, void 0];
				const commitCharacterDefaults =
					list.itemDefaults?.commitCharacters ?? allCommitCharacters;
				return new code.CompletionList(
					list.items.map((item) => {
						const result2 = asCompletionItem(
							item,
							commitCharacterDefaults,
							list.itemDefaults?.insertTextMode,
							list.itemDefaults?.insertTextFormat
						);
						if (result2.range === void 0) {
							if (range !== void 0) {
								result2.range = range;
							} else if (inserting !== void 0 && replacing !== void 0) {
								result2.range = { inserting, replacing };
							}
						}
						return result2;
					}),
					list.isIncomplete
				);
			}
			function asCompletionItemKind(value) {
				if (
					ls2.CompletionItemKind.Text <= value &&
					value <= ls2.CompletionItemKind.TypeParameter
				) {
					return [value - 1, void 0];
				}
				return [code.CompletionItemKind.Text, value];
			}
			function asCompletionItemTag(tag) {
				switch (tag) {
					case ls2.CompletionItemTag.Deprecated:
						return code.CompletionItemTag.Deprecated;
				}
				return void 0;
			}
			function asCompletionItemTags(tags) {
				if (tags === void 0 || tags === null) {
					return [];
				}
				const result = [];
				for (const tag of tags) {
					const converted = asCompletionItemTag(tag);
					if (converted !== void 0) {
						result.push(converted);
					}
				}
				return result;
			}
			function asCompletionItem(
				item,
				defaultCommitCharacters,
				defaultInsertTextMode,
				defaultInsertTextFormat
			) {
				const tags = asCompletionItemTags(item.tags);
				const label = asCompletionItemLabel(item);
				const result = new protocolCompletionItem_1.default(label);
				if (item.detail) {
					result.detail = item.detail;
				}
				if (item.documentation) {
					result.documentation = asDocumentation(item.documentation);
					result.documentationFormat = Is2.string(item.documentation)
						? '$string'
						: item.documentation.kind;
				}
				if (item.filterText) {
					result.filterText = item.filterText;
				}
				const insertText = asCompletionInsertText(
					item,
					defaultInsertTextFormat
				);
				if (insertText) {
					result.insertText = insertText.text;
					result.range = insertText.range;
					result.fromEdit = insertText.fromEdit;
				}
				if (Is2.number(item.kind)) {
					let [itemKind, original] = asCompletionItemKind(item.kind);
					result.kind = itemKind;
					if (original) {
						result.originalItemKind = original;
					}
				}
				if (item.sortText) {
					result.sortText = item.sortText;
				}
				if (item.additionalTextEdits) {
					result.additionalTextEdits = asTextEdits(item.additionalTextEdits);
				}
				const commitCharacters =
					item.commitCharacters !== void 0
						? Is2.stringArray(item.commitCharacters)
							? item.commitCharacters
							: void 0
						: defaultCommitCharacters;
				if (commitCharacters) {
					result.commitCharacters = commitCharacters.slice();
				}
				if (item.command) {
					result.command = asCommand(item.command);
				}
				if (item.deprecated === true || item.deprecated === false) {
					result.deprecated = item.deprecated;
					if (item.deprecated === true) {
						tags.push(code.CompletionItemTag.Deprecated);
					}
				}
				if (item.preselect === true || item.preselect === false) {
					result.preselect = item.preselect;
				}
				if (item.data !== void 0) {
					result.data = item.data;
				}
				if (tags.length > 0) {
					result.tags = tags;
				}
				const insertTextMode = item.insertTextMode ?? defaultInsertTextMode;
				if (insertTextMode !== void 0) {
					result.insertTextMode = insertTextMode;
					if (
						insertTextMode ===
						vscode_languageserver_protocol_1.InsertTextMode.asIs
					) {
						result.keepWhitespace = true;
					}
				}
				return result;
			}
			function asCompletionItemLabel(item) {
				if (
					vscode_languageserver_protocol_1.CompletionItemLabelDetails.is(
						item.labelDetails
					)
				) {
					return {
						label: item.label,
						detail: item.labelDetails.detail,
						description: item.labelDetails.description,
					};
				} else {
					return item.label;
				}
			}
			function asCompletionInsertText(item, defaultInsertTextFormat) {
				const insertTextFormat =
					item.insertTextFormat ?? defaultInsertTextFormat;
				if (item.textEdit) {
					if (insertTextFormat === ls2.InsertTextFormat.Snippet) {
						return {
							text: new code.SnippetString(item.textEdit.newText),
							range: asCompletionRange(item.textEdit),
							fromEdit: true,
						};
					} else {
						return {
							text: item.textEdit.newText,
							range: asCompletionRange(item.textEdit),
							fromEdit: true,
						};
					}
				} else if (item.insertText) {
					if (insertTextFormat === ls2.InsertTextFormat.Snippet) {
						return {
							text: new code.SnippetString(item.insertText),
							fromEdit: false,
						};
					} else {
						return { text: item.insertText, fromEdit: false };
					}
				} else {
					return void 0;
				}
			}
			function asCompletionRange(value) {
				if (ls2.InsertReplaceEdit.is(value)) {
					return {
						inserting: asRange(value.insert),
						replacing: asRange(value.replace),
					};
				} else {
					return asRange(value.range);
				}
			}
			function asTextEdit(edit) {
				if (!edit) {
					return void 0;
				}
				return new code.TextEdit(asRange(edit.range), edit.newText);
			}
			function asTextEdits(items) {
				if (!items) {
					return void 0;
				}
				return items.map(asTextEdit);
			}
			function asSignatureHelp(item) {
				if (!item) {
					return void 0;
				}
				let result = new code.SignatureHelp();
				if (Is2.number(item.activeSignature)) {
					result.activeSignature = item.activeSignature;
				} else {
					result.activeSignature = 0;
				}
				if (Is2.number(item.activeParameter)) {
					result.activeParameter = item.activeParameter;
				} else {
					result.activeParameter = 0;
				}
				if (item.signatures) {
					result.signatures = asSignatureInformations(item.signatures);
				}
				return result;
			}
			function asSignatureInformations(items) {
				return items.map(asSignatureInformation);
			}
			function asSignatureInformation(item) {
				let result = new code.SignatureInformation(item.label);
				if (item.documentation !== void 0) {
					result.documentation = asDocumentation(item.documentation);
				}
				if (item.parameters !== void 0) {
					result.parameters = asParameterInformations(item.parameters);
				}
				if (item.activeParameter !== void 0) {
					result.activeParameter = item.activeParameter;
				}
				{
					return result;
				}
			}
			function asParameterInformations(item) {
				return item.map(asParameterInformation);
			}
			function asParameterInformation(item) {
				let result = new code.ParameterInformation(item.label);
				if (item.documentation) {
					result.documentation = asDocumentation(item.documentation);
				}
				return result;
			}
			function asLocation(item) {
				if (!item) {
					return void 0;
				}
				return new code.Location(_uriConverter(item.uri), asRange(item.range));
			}
			function asDeclarationResult(item) {
				if (!item) {
					return void 0;
				}
				return asLocationResult(item);
			}
			function asDefinitionResult(item) {
				if (!item) {
					return void 0;
				}
				return asLocationResult(item);
			}
			function asLocationLink(item) {
				if (!item) {
					return void 0;
				}
				let result = {
					targetUri: _uriConverter(item.targetUri),
					targetRange: asRange(item.targetRange),
					originSelectionRange: asRange(item.originSelectionRange),
					targetSelectionRange: asRange(item.targetSelectionRange),
				};
				if (!result.targetSelectionRange) {
					throw new Error(`targetSelectionRange must not be undefined or null`);
				}
				return result;
			}
			function asLocationResult(item) {
				if (!item) {
					return void 0;
				}
				if (Is2.array(item)) {
					if (item.length === 0) {
						return [];
					} else if (ls2.LocationLink.is(item[0])) {
						let links = item;
						return links.map((link) => asLocationLink(link));
					} else {
						let locations = item;
						return locations.map((location2) => asLocation(location2));
					}
				} else if (ls2.LocationLink.is(item)) {
					return [asLocationLink(item)];
				} else {
					return asLocation(item);
				}
			}
			function asReferences(values) {
				if (!values) {
					return void 0;
				}
				return values.map((location2) => asLocation(location2));
			}
			function asDocumentHighlights(values) {
				if (!values) {
					return void 0;
				}
				return values.map(asDocumentHighlight);
			}
			function asDocumentHighlight(item) {
				let result = new code.DocumentHighlight(asRange(item.range));
				if (Is2.number(item.kind)) {
					result.kind = asDocumentHighlightKind(item.kind);
				}
				return result;
			}
			function asDocumentHighlightKind(item) {
				switch (item) {
					case ls2.DocumentHighlightKind.Text:
						return code.DocumentHighlightKind.Text;
					case ls2.DocumentHighlightKind.Read:
						return code.DocumentHighlightKind.Read;
					case ls2.DocumentHighlightKind.Write:
						return code.DocumentHighlightKind.Write;
				}
				return code.DocumentHighlightKind.Text;
			}
			function asSymbolInformations(values) {
				if (!values) {
					return void 0;
				}
				return values.map((information) => asSymbolInformation(information));
			}
			function asSymbolKind(item) {
				if (item <= ls2.SymbolKind.TypeParameter) {
					return item - 1;
				}
				return code.SymbolKind.Property;
			}
			function asSymbolTag(value) {
				switch (value) {
					case ls2.SymbolTag.Deprecated:
						return code.SymbolTag.Deprecated;
					default:
						return void 0;
				}
			}
			function asSymbolTags(items) {
				if (items === void 0 || items === null) {
					return void 0;
				}
				const result = [];
				for (const item of items) {
					const converted = asSymbolTag(item);
					if (converted !== void 0) {
						result.push(converted);
					}
				}
				return result.length === 0 ? void 0 : result;
			}
			function asSymbolInformation(item) {
				const data = item.data;
				const location2 = item.location;
				const result =
					location2.range === void 0 || data !== void 0
						? new protocolWorkspaceSymbol_1.default(
								item.name,
								asSymbolKind(item.kind),
								item.containerName ?? '',
								location2.range === void 0
									? _uriConverter(location2.uri)
									: new code.Location(
											_uriConverter(item.location.uri),
											asRange(location2.range)
									  ),
								data
						  )
						: new code.SymbolInformation(
								item.name,
								asSymbolKind(item.kind),
								item.containerName ?? '',
								new code.Location(
									_uriConverter(item.location.uri),
									asRange(location2.range)
								)
						  );
				fillTags(result, item);
				return result;
			}
			function asDocumentSymbols(values) {
				if (values === void 0 || values === null) {
					return void 0;
				}
				return values.map(asDocumentSymbol);
			}
			function asDocumentSymbol(value) {
				let result = new code.DocumentSymbol(
					value.name,
					value.detail || '',
					asSymbolKind(value.kind),
					asRange(value.range),
					asRange(value.selectionRange)
				);
				fillTags(result, value);
				if (value.children !== void 0 && value.children.length > 0) {
					let children = [];
					for (let child of value.children) {
						children.push(asDocumentSymbol(child));
					}
					result.children = children;
				}
				return result;
			}
			function fillTags(result, value) {
				result.tags = asSymbolTags(value.tags);
				if (value.deprecated) {
					if (!result.tags) {
						result.tags = [code.SymbolTag.Deprecated];
					} else {
						if (!result.tags.includes(code.SymbolTag.Deprecated)) {
							result.tags = result.tags.concat(code.SymbolTag.Deprecated);
						}
					}
				}
			}
			function asCommand(item) {
				let result = { title: item.title, command: item.command };
				if (item.arguments) {
					result.arguments = item.arguments;
				}
				return result;
			}
			function asCommands(items) {
				if (!items) {
					return void 0;
				}
				return items.map(asCommand);
			}
			const kindMapping = new Map();
			kindMapping.set(ls2.CodeActionKind.Empty, code.CodeActionKind.Empty);
			kindMapping.set(
				ls2.CodeActionKind.QuickFix,
				code.CodeActionKind.QuickFix
			);
			kindMapping.set(
				ls2.CodeActionKind.Refactor,
				code.CodeActionKind.Refactor
			);
			kindMapping.set(
				ls2.CodeActionKind.RefactorExtract,
				code.CodeActionKind.RefactorExtract
			);
			kindMapping.set(
				ls2.CodeActionKind.RefactorInline,
				code.CodeActionKind.RefactorInline
			);
			kindMapping.set(
				ls2.CodeActionKind.RefactorRewrite,
				code.CodeActionKind.RefactorRewrite
			);
			kindMapping.set(ls2.CodeActionKind.Source, code.CodeActionKind.Source);
			kindMapping.set(
				ls2.CodeActionKind.SourceOrganizeImports,
				code.CodeActionKind.SourceOrganizeImports
			);
			function asCodeActionKind(item) {
				if (item === void 0 || item === null) {
					return void 0;
				}
				let result = kindMapping.get(item);
				if (result) {
					return result;
				}
				let parts = item.split('.');
				result = code.CodeActionKind.Empty;
				for (let part of parts) {
					result = result.append(part);
				}
				return result;
			}
			function asCodeActionKinds(items) {
				if (items === void 0 || items === null) {
					return void 0;
				}
				return items.map((kind) => asCodeActionKind(kind));
			}
			function asCodeAction(item) {
				if (item === void 0 || item === null) {
					return void 0;
				}
				let result = new protocolCodeAction_1.default(item.title, item.data);
				if (item.kind !== void 0) {
					result.kind = asCodeActionKind(item.kind);
				}
				if (item.diagnostics !== void 0) {
					result.diagnostics = asDiagnostics(item.diagnostics);
				}
				if (item.edit !== void 0) {
					result.edit = asWorkspaceEdit(item.edit);
				}
				if (item.command !== void 0) {
					result.command = asCommand(item.command);
				}
				if (item.isPreferred !== void 0) {
					result.isPreferred = item.isPreferred;
				}
				if (item.disabled !== void 0) {
					result.disabled = { reason: item.disabled.reason };
				}
				return result;
			}
			function asCodeLens(item) {
				if (!item) {
					return void 0;
				}
				let result = new protocolCodeLens_1.default(asRange(item.range));
				if (item.command) {
					result.command = asCommand(item.command);
				}
				if (item.data !== void 0 && item.data !== null) {
					result.data = item.data;
				}
				return result;
			}
			function asCodeLenses(items) {
				if (!items) {
					return void 0;
				}
				return items.map((codeLens) => asCodeLens(codeLens));
			}
			function asWorkspaceEdit(item) {
				if (!item) {
					return void 0;
				}
				const sharedMetadata = new Map();
				if (item.changeAnnotations !== void 0) {
					for (const key of Object.keys(item.changeAnnotations)) {
						const metaData = asWorkspaceEditEntryMetadata(
							item.changeAnnotations[key]
						);
						sharedMetadata.set(key, metaData);
					}
				}
				const asMetadata = (annotation) => {
					if (annotation === void 0) {
						return void 0;
					} else {
						return sharedMetadata.get(annotation);
					}
				};
				const result = new code.WorkspaceEdit();
				if (item.documentChanges) {
					for (const change of item.documentChanges) {
						if (ls2.CreateFile.is(change)) {
							result.createFile(
								_uriConverter(change.uri),
								change.options,
								asMetadata(change.annotationId)
							);
						} else if (ls2.RenameFile.is(change)) {
							result.renameFile(
								_uriConverter(change.oldUri),
								_uriConverter(change.newUri),
								change.options,
								asMetadata(change.annotationId)
							);
						} else if (ls2.DeleteFile.is(change)) {
							result.deleteFile(
								_uriConverter(change.uri),
								change.options,
								asMetadata(change.annotationId)
							);
						} else if (ls2.TextDocumentEdit.is(change)) {
							const uri = _uriConverter(change.textDocument.uri);
							for (const edit of change.edits) {
								if (
									vscode_languageserver_protocol_1.AnnotatedTextEdit.is(edit)
								) {
									result.replace(
										uri,
										asRange(edit.range),
										edit.newText,
										asMetadata(edit.annotationId)
									);
								} else {
									result.replace(uri, asRange(edit.range), edit.newText);
								}
							}
						} else {
							throw new Error(`Unknown workspace edit change received:
${JSON.stringify(change, void 0, 4)}`);
						}
					}
				} else if (item.changes) {
					Object.keys(item.changes).forEach((key) => {
						result.set(_uriConverter(key), asTextEdits(item.changes[key]));
					});
				}
				return result;
			}
			function asWorkspaceEditEntryMetadata(annotation) {
				if (annotation === void 0) {
					return void 0;
				}
				return {
					label: annotation.label,
					needsConfirmation: !!annotation.needsConfirmation,
					description: annotation.description,
				};
			}
			function asDocumentLink(item) {
				let range = asRange(item.range);
				let target = item.target ? asUri(item.target) : void 0;
				let link = new protocolDocumentLink_1.default(range, target);
				if (item.tooltip !== void 0) {
					link.tooltip = item.tooltip;
				}
				if (item.data !== void 0 && item.data !== null) {
					link.data = item.data;
				}
				return link;
			}
			function asDocumentLinks(items) {
				if (!items) {
					return void 0;
				}
				return items.map(asDocumentLink);
			}
			function asColor(color) {
				return new code.Color(color.red, color.green, color.blue, color.alpha);
			}
			function asColorInformation(ci2) {
				return new code.ColorInformation(
					asRange(ci2.range),
					asColor(ci2.color)
				);
			}
			function asColorInformations(colorInformation) {
				if (Array.isArray(colorInformation)) {
					return colorInformation.map(asColorInformation);
				}
				return void 0;
			}
			function asColorPresentation(cp) {
				let presentation = new code.ColorPresentation(cp.label);
				presentation.additionalTextEdits = asTextEdits(cp.additionalTextEdits);
				if (cp.textEdit) {
					presentation.textEdit = asTextEdit(cp.textEdit);
				}
				return presentation;
			}
			function asColorPresentations(colorPresentations) {
				if (Array.isArray(colorPresentations)) {
					return colorPresentations.map(asColorPresentation);
				}
				return void 0;
			}
			function asFoldingRangeKind(kind) {
				if (kind) {
					switch (kind) {
						case ls2.FoldingRangeKind.Comment:
							return code.FoldingRangeKind.Comment;
						case ls2.FoldingRangeKind.Imports:
							return code.FoldingRangeKind.Imports;
						case ls2.FoldingRangeKind.Region:
							return code.FoldingRangeKind.Region;
					}
				}
				return void 0;
			}
			function asFoldingRange(r) {
				return new code.FoldingRange(
					r.startLine,
					r.endLine,
					asFoldingRangeKind(r.kind)
				);
			}
			function asFoldingRanges(foldingRanges) {
				if (Array.isArray(foldingRanges)) {
					return foldingRanges.map(asFoldingRange);
				}
				return void 0;
			}
			function asSelectionRange(selectionRange) {
				return new code.SelectionRange(
					asRange(selectionRange.range),
					selectionRange.parent
						? asSelectionRange(selectionRange.parent)
						: void 0
				);
			}
			function asSelectionRanges(selectionRanges) {
				if (!Array.isArray(selectionRanges)) {
					return [];
				}
				let result = [];
				for (let range of selectionRanges) {
					result.push(asSelectionRange(range));
				}
				return result;
			}
			function asInlineValue(inlineValue) {
				if (ls2.InlineValueText.is(inlineValue)) {
					return new code.InlineValueText(
						asRange(inlineValue.range),
						inlineValue.text
					);
				} else if (ls2.InlineValueVariableLookup.is(inlineValue)) {
					return new code.InlineValueVariableLookup(
						asRange(inlineValue.range),
						inlineValue.variableName,
						inlineValue.caseSensitiveLookup
					);
				} else {
					return new code.InlineValueEvaluatableExpression(
						asRange(inlineValue.range),
						inlineValue.expression
					);
				}
			}
			function asInlineValues(inlineValues) {
				if (!Array.isArray(inlineValues)) {
					return [];
				}
				const result = [];
				for (const inlineValue of inlineValues) {
					result.push(asInlineValue(inlineValue));
				}
				return result;
			}
			function asCallHierarchyItem(item) {
				if (item === null) {
					return void 0;
				}
				const result = new protocolCallHierarchyItem_1.default(
					asSymbolKind(item.kind),
					item.name,
					item.detail || '',
					asUri(item.uri),
					asRange(item.range),
					asRange(item.selectionRange),
					item.data
				);
				if (item.tags !== void 0) {
					result.tags = asSymbolTags(item.tags);
				}
				return result;
			}
			function asCallHierarchyItems(items) {
				if (items === null) {
					return void 0;
				}
				return items.map((item) => asCallHierarchyItem(item));
			}
			function asCallHierarchyIncomingCall(item) {
				return new code.CallHierarchyIncomingCall(
					asCallHierarchyItem(item.from),
					asRanges(item.fromRanges)
				);
			}
			function asCallHierarchyIncomingCalls(items) {
				if (items === null) {
					return void 0;
				}
				return items.map((item) => asCallHierarchyIncomingCall(item));
			}
			function asCallHierarchyOutgoingCall(item) {
				return new code.CallHierarchyOutgoingCall(
					asCallHierarchyItem(item.to),
					asRanges(item.fromRanges)
				);
			}
			function asCallHierarchyOutgoingCalls(items) {
				if (items === null) {
					return void 0;
				}
				return items.map((item) => asCallHierarchyOutgoingCall(item));
			}
			function asSemanticTokens(value) {
				if (value === void 0 || value === null) {
					return void 0;
				}
				return new code.SemanticTokens(
					new Uint32Array(value.data),
					value.resultId
				);
			}
			function asSemanticTokensEdit(value) {
				return new code.SemanticTokensEdit(
					value.start,
					value.deleteCount,
					value.data !== void 0 ? new Uint32Array(value.data) : void 0
				);
			}
			function asSemanticTokensEdits(value) {
				if (value === void 0 || value === null) {
					return void 0;
				}
				return new code.SemanticTokensEdits(
					value.edits.map(asSemanticTokensEdit),
					value.resultId
				);
			}
			function asSemanticTokensLegend(value) {
				return value;
			}
			function asLinkedEditingRanges(value) {
				if (value === null || value === void 0) {
					return void 0;
				}
				return new code.LinkedEditingRanges(
					asRanges(value.ranges),
					asRegularExpression(value.wordPattern)
				);
			}
			function asRegularExpression(value) {
				if (value === null || value === void 0) {
					return void 0;
				}
				return new RegExp(value);
			}
			function asTypeHierarchyItem(item) {
				if (item === null) {
					return void 0;
				}
				let result = new protocolTypeHierarchyItem_1.default(
					asSymbolKind(item.kind),
					item.name,
					item.detail || '',
					asUri(item.uri),
					asRange(item.range),
					asRange(item.selectionRange),
					item.data
				);
				if (item.tags !== void 0) {
					result.tags = asSymbolTags(item.tags);
				}
				return result;
			}
			function asTypeHierarchyItems(items) {
				if (items === null) {
					return void 0;
				}
				return items.map((item) => asTypeHierarchyItem(item));
			}
			return {
				asUri,
				asDiagnostics,
				asDiagnostic,
				asRange,
				asRanges,
				asPosition,
				asDiagnosticSeverity,
				asDiagnosticTag,
				asHover,
				asCompletionResult,
				asCompletionItem,
				asTextEdit,
				asTextEdits,
				asSignatureHelp,
				asSignatureInformations,
				asSignatureInformation,
				asParameterInformations,
				asParameterInformation,
				asDeclarationResult,
				asDefinitionResult,
				asLocation,
				asReferences,
				asDocumentHighlights,
				asDocumentHighlight,
				asDocumentHighlightKind,
				asSymbolKind,
				asSymbolTag,
				asSymbolTags,
				asSymbolInformations,
				asSymbolInformation,
				asDocumentSymbols,
				asDocumentSymbol,
				asCommand,
				asCommands,
				asCodeAction,
				asCodeActionKind,
				asCodeActionKinds,
				asCodeLens,
				asCodeLenses,
				asWorkspaceEdit,
				asDocumentLink,
				asDocumentLinks,
				asFoldingRangeKind,
				asFoldingRange,
				asFoldingRanges,
				asColor,
				asColorInformation,
				asColorInformations,
				asColorPresentation,
				asColorPresentations,
				asSelectionRange,
				asSelectionRanges,
				asInlineValue,
				asInlineValues,
				asSemanticTokensLegend,
				asSemanticTokens,
				asSemanticTokensEdit,
				asSemanticTokensEdits,
				asCallHierarchyItem,
				asCallHierarchyItems,
				asCallHierarchyIncomingCall,
				asCallHierarchyIncomingCalls,
				asCallHierarchyOutgoingCall,
				asCallHierarchyOutgoingCalls,
				asLinkedEditingRanges,
				asTypeHierarchyItem,
				asTypeHierarchyItems,
			};
		}
		exports.createConverter = createConverter;
	},
});

// client/node_modules/vscode-languageclient/lib/common/utils/async.js
let require_async = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/utils/async.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.Delayer = void 0;
		let vscode_languageserver_protocol_1 = require_main3();
		let Delayer = class {
			constructor(defaultDelay) {
				this.defaultDelay = defaultDelay;
				this.timeout = void 0;
				this.completionPromise = void 0;
				this.onSuccess = void 0;
				this.task = void 0;
			}
			trigger(task, delay = this.defaultDelay) {
				this.task = task;
				if (delay >= 0) {
					this.cancelTimeout();
				}
				if (!this.completionPromise) {
					this.completionPromise = new Promise((resolve) => {
						this.onSuccess = resolve;
					}).then(() => {
						this.completionPromise = void 0;
						this.onSuccess = void 0;
						let result = this.task();
						this.task = void 0;
						return result;
					});
				}
				if (delay >= 0 || this.timeout === void 0) {
					this.timeout = (0,
					vscode_languageserver_protocol_1.RAL)().timer.setTimeout(
						() => {
							this.timeout = void 0;
							this.onSuccess(void 0);
						},
						delay >= 0 ? delay : this.defaultDelay
					);
				}
				return this.completionPromise;
			}
			forceDelivery() {
				if (!this.completionPromise) {
					return void 0;
				}
				this.cancelTimeout();
				let result = this.task();
				this.completionPromise = void 0;
				this.onSuccess = void 0;
				this.task = void 0;
				return result;
			}
			isTriggered() {
				return this.timeout !== void 0;
			}
			cancel() {
				this.cancelTimeout();
				this.completionPromise = void 0;
			}
			cancelTimeout() {
				if (this.timeout !== void 0) {
					this.timeout.dispose();
					this.timeout = void 0;
				}
			}
		};
		exports.Delayer = Delayer;
	},
});

// client/node_modules/vscode-languageclient/lib/common/utils/uuid.js
let require_uuid = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/utils/uuid.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.generateUuid = exports.parse = exports.isUUID = exports.v4 = exports.empty = void 0;
		let ValueUUID = class {
			constructor(_value) {
				this._value = _value;
			}
			asHex() {
				return this._value;
			}
			equals(other) {
				return this.asHex() === other.asHex();
			}
		};
		var V4UUID = class extends ValueUUID {
			constructor() {
				super(
					[
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						'-',
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						'-',
						'4',
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						'-',
						V4UUID._oneOf(V4UUID._timeHighBits),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						'-',
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
						V4UUID._randomHex(),
					].join('')
				);
			}
			static _oneOf(array) {
				return array[Math.floor(array.length * Math.random())];
			}
			static _randomHex() {
				return V4UUID._oneOf(V4UUID._chars);
			}
		};
		V4UUID._chars = [
			'0',
			'1',
			'2',
			'3',
			'4',
			'5',
			'6',
			'6',
			'7',
			'8',
			'9',
			'a',
			'b',
			'c',
			'd',
			'e',
			'f',
		];
		V4UUID._timeHighBits = ['8', '9', 'a', 'b'];
		exports.empty = new ValueUUID('00000000-0000-0000-0000-000000000000');
		function v4() {
			return new V4UUID();
		}
		exports.v4 = v4;
		let _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		function isUUID(value) {
			return _UUIDPattern.test(value);
		}
		exports.isUUID = isUUID;
		function parse(value) {
			if (!isUUID(value)) {
				throw new Error('invalid uuid');
			}
			return new ValueUUID(value);
		}
		exports.parse = parse;
		function generateUuid() {
			return v4().asHex();
		}
		exports.generateUuid = generateUuid;
	},
});

// client/node_modules/vscode-languageclient/lib/common/progressPart.js
let require_progressPart = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/progressPart.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ProgressPart = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let Is2 = require_is3();
		let ProgressPart = class {
			constructor(_client, _token, done) {
				this._client = _client;
				this._token = _token;
				this._reported = 0;
				this._infinite = false;
				this._lspProgressDisposable = this._client.onProgress(
					vscode_languageserver_protocol_1.WorkDoneProgress.type,
					this._token,
					(value) => {
						switch (value.kind) {
							case 'begin':
								this.begin(value);
								break;
							case 'report':
								this.report(value);
								break;
							case 'end':
								this.done();
								done && done(this);
								break;
						}
					}
				);
			}
			begin(params) {
				this._infinite = params.percentage === void 0;
				if (this._lspProgressDisposable === void 0) {
					return;
				}
				void vscode_1.window.withProgress(
					{
						location: vscode_1.ProgressLocation.Window,
						cancellable: params.cancellable,
						title: params.title,
					},
					async (progress, cancellationToken) => {
						if (this._lspProgressDisposable === void 0) {
							return;
						}
						this._progress = progress;
						this._cancellationToken = cancellationToken;
						this._tokenDisposable = this._cancellationToken.onCancellationRequested(
							() => {
								this._client.sendNotification(
									vscode_languageserver_protocol_1
										.WorkDoneProgressCancelNotification.type,
									{ token: this._token }
								);
							}
						);
						this.report(params);
						return new Promise((resolve, reject) => {
							this._resolve = resolve;
							this._reject = reject;
						});
					}
				);
			}
			report(params) {
				if (this._infinite && Is2.string(params.message)) {
					this._progress !== void 0 &&
						this._progress.report({ message: params.message });
				} else if (Is2.number(params.percentage)) {
					const percentage = Math.max(0, Math.min(params.percentage, 100));
					const delta = Math.max(0, percentage - this._reported);
					this._reported += delta;
					this._progress !== void 0 &&
						this._progress.report({
							message: params.message,
							increment: delta,
						});
				}
			}
			cancel() {
				this.cleanup();
				if (this._reject !== void 0) {
					this._reject();
					this._resolve = void 0;
					this._reject = void 0;
				}
			}
			done() {
				this.cleanup();
				if (this._resolve !== void 0) {
					this._resolve();
					this._resolve = void 0;
					this._reject = void 0;
				}
			}
			cleanup() {
				if (this._lspProgressDisposable !== void 0) {
					this._lspProgressDisposable.dispose();
					this._lspProgressDisposable = void 0;
				}
				if (this._tokenDisposable !== void 0) {
					this._tokenDisposable.dispose();
					this._tokenDisposable = void 0;
				}
				this._progress = void 0;
				this._cancellationToken = void 0;
			}
		};
		exports.ProgressPart = ProgressPart;
	},
});

// client/node_modules/vscode-languageclient/lib/common/client.js
let require_client = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/client.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.BaseLanguageClient = exports.LSPCancellationError = exports.MessageTransports = exports.TextDocumentFeature = exports.State = exports.RevealOutputChannelOn = exports.DiagnosticPullMode = exports.CloseAction = exports.ErrorAction = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let configuration_1 = require_configuration();
		let c2p = require_codeConverter();
		let p2c = require_protocolConverter();
		let Is2 = require_is3();
		let async_1 = require_async();
		let UUID = require_uuid();
		let progressPart_1 = require_progressPart();
		let ConsoleLogger = class {
			error(message) {
				(0, vscode_languageserver_protocol_1.RAL)().console.error(message);
			}
			warn(message) {
				(0, vscode_languageserver_protocol_1.RAL)().console.warn(message);
			}
			info(message) {
				(0, vscode_languageserver_protocol_1.RAL)().console.info(message);
			}
			log(message) {
				(0, vscode_languageserver_protocol_1.RAL)().console.log(message);
			}
		};
		function createConnection(
			input,
			output,
			errorHandler,
			closeHandler,
			options
		) {
			let logger = new ConsoleLogger();
			let connection = (0,
			vscode_languageserver_protocol_1.createProtocolConnection)(
				input,
				output,
				logger,
				options
			);
			connection.onError((data) => {
				errorHandler(data[0], data[1], data[2]);
			});
			connection.onClose(closeHandler);
			let result = {
				listen: () => connection.listen(),
				sendRequest: (type, ...params) =>
					connection.sendRequest(type, ...params),
				onRequest: (type, handler) => connection.onRequest(type, handler),
				sendNotification: (type, params) =>
					connection.sendNotification(type, params),
				onNotification: (type, handler) =>
					connection.onNotification(type, handler),
				onProgress: connection.onProgress,
				sendProgress: connection.sendProgress,
				trace: (value, tracer, sendNotificationOrTraceOptions) => {
					const defaultTraceOptions = {
						sendNotification: false,
						traceFormat: vscode_languageserver_protocol_1.TraceFormat.Text,
					};
					if (sendNotificationOrTraceOptions === void 0) {
						connection.trace(value, tracer, defaultTraceOptions);
					} else if (Is2.boolean(sendNotificationOrTraceOptions)) {
						connection.trace(value, tracer, sendNotificationOrTraceOptions);
					} else {
						connection.trace(value, tracer, sendNotificationOrTraceOptions);
					}
				},
				initialize: (params) =>
					connection.sendRequest(
						vscode_languageserver_protocol_1.InitializeRequest.type,
						params
					),
				shutdown: () =>
					connection.sendRequest(
						vscode_languageserver_protocol_1.ShutdownRequest.type,
						void 0
					),
				exit: () =>
					connection.sendNotification(
						vscode_languageserver_protocol_1.ExitNotification.type
					),
				onLogMessage: (handler) =>
					connection.onNotification(
						vscode_languageserver_protocol_1.LogMessageNotification.type,
						handler
					),
				onShowMessage: (handler) =>
					connection.onNotification(
						vscode_languageserver_protocol_1.ShowMessageNotification.type,
						handler
					),
				onTelemetry: (handler) =>
					connection.onNotification(
						vscode_languageserver_protocol_1.TelemetryEventNotification.type,
						handler
					),
				didChangeConfiguration: (params) =>
					connection.sendNotification(
						vscode_languageserver_protocol_1.DidChangeConfigurationNotification
							.type,
						params
					),
				didChangeWatchedFiles: (params) =>
					connection.sendNotification(
						vscode_languageserver_protocol_1.DidChangeWatchedFilesNotification
							.type,
						params
					),
				didOpenTextDocument: (params) =>
					connection.sendNotification(
						vscode_languageserver_protocol_1.DidOpenTextDocumentNotification
							.type,
						params
					),
				didChangeTextDocument: (params) =>
					connection.sendNotification(
						vscode_languageserver_protocol_1.DidChangeTextDocumentNotification
							.type,
						params
					),
				didCloseTextDocument: (params) =>
					connection.sendNotification(
						vscode_languageserver_protocol_1.DidCloseTextDocumentNotification
							.type,
						params
					),
				didSaveTextDocument: (params) =>
					connection.sendNotification(
						vscode_languageserver_protocol_1.DidSaveTextDocumentNotification
							.type,
						params
					),
				onDiagnostics: (handler) =>
					connection.onNotification(
						vscode_languageserver_protocol_1.PublishDiagnosticsNotification
							.type,
						handler
					),
				end: () => connection.end(),
				dispose: () => connection.dispose(),
			};
			return result;
		}
		let ErrorAction;
		(function (ErrorAction2) {
			ErrorAction2[(ErrorAction2['Continue'] = 1)] = 'Continue';
			ErrorAction2[(ErrorAction2['Shutdown'] = 2)] = 'Shutdown';
		})((ErrorAction = exports.ErrorAction || (exports.ErrorAction = {})));
		let CloseAction;
		(function (CloseAction2) {
			CloseAction2[(CloseAction2['DoNotRestart'] = 1)] = 'DoNotRestart';
			CloseAction2[(CloseAction2['Restart'] = 2)] = 'Restart';
		})((CloseAction = exports.CloseAction || (exports.CloseAction = {})));
		let DefaultErrorHandler = class {
			constructor(client, maxRestartCount) {
				this.client = client;
				this.maxRestartCount = maxRestartCount;
				this.restarts = [];
			}
			error(_error, _message, count) {
				if (count && count <= 3) {
					return { action: ErrorAction.Continue };
				}
				return { action: ErrorAction.Shutdown };
			}
			closed() {
				this.restarts.push(Date.now());
				if (this.restarts.length <= this.maxRestartCount) {
					return { action: CloseAction.Restart };
				} else {
					let diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
					if (diff <= 3 * 60 * 1e3) {
						return {
							action: CloseAction.DoNotRestart,
							message: `The ${this.client.name} server crashed ${
								this.maxRestartCount + 1
							} times in the last 3 minutes. The server will not be restarted. The output for more information.`,
						};
					} else {
						this.restarts.shift();
						return { action: CloseAction.Restart };
					}
				}
			}
		};
		let DiagnosticPullMode;
		(function (DiagnosticPullMode2) {
			DiagnosticPullMode2['onType'] = 'onType';
			DiagnosticPullMode2['onSave'] = 'onSave';
		})(
			(DiagnosticPullMode =
				exports.DiagnosticPullMode || (exports.DiagnosticPullMode = {}))
		);
		let RevealOutputChannelOn2;
		(function (RevealOutputChannelOn3) {
			RevealOutputChannelOn3[(RevealOutputChannelOn3['Info'] = 1)] = 'Info';
			RevealOutputChannelOn3[(RevealOutputChannelOn3['Warn'] = 2)] = 'Warn';
			RevealOutputChannelOn3[(RevealOutputChannelOn3['Error'] = 3)] = 'Error';
			RevealOutputChannelOn3[(RevealOutputChannelOn3['Never'] = 4)] = 'Never';
		})(
			(RevealOutputChannelOn2 =
				exports.RevealOutputChannelOn || (exports.RevealOutputChannelOn = {}))
		);
		let State;
		(function (State2) {
			State2[(State2['Stopped'] = 1)] = 'Stopped';
			State2[(State2['Starting'] = 3)] = 'Starting';
			State2[(State2['Running'] = 2)] = 'Running';
		})((State = exports.State || (exports.State = {})));
		let ClientState;
		(function (ClientState2) {
			ClientState2[(ClientState2['Initial'] = 0)] = 'Initial';
			ClientState2[(ClientState2['Starting'] = 1)] = 'Starting';
			ClientState2[(ClientState2['StartFailed'] = 2)] = 'StartFailed';
			ClientState2[(ClientState2['Running'] = 3)] = 'Running';
			ClientState2[(ClientState2['Stopping'] = 4)] = 'Stopping';
			ClientState2[(ClientState2['Stopped'] = 5)] = 'Stopped';
		})(ClientState || (ClientState = {}));
		let SupportedSymbolKinds = [
			vscode_languageserver_protocol_1.SymbolKind.File,
			vscode_languageserver_protocol_1.SymbolKind.Module,
			vscode_languageserver_protocol_1.SymbolKind.Namespace,
			vscode_languageserver_protocol_1.SymbolKind.Package,
			vscode_languageserver_protocol_1.SymbolKind.Class,
			vscode_languageserver_protocol_1.SymbolKind.Method,
			vscode_languageserver_protocol_1.SymbolKind.Property,
			vscode_languageserver_protocol_1.SymbolKind.Field,
			vscode_languageserver_protocol_1.SymbolKind.Constructor,
			vscode_languageserver_protocol_1.SymbolKind.Enum,
			vscode_languageserver_protocol_1.SymbolKind.Interface,
			vscode_languageserver_protocol_1.SymbolKind.Function,
			vscode_languageserver_protocol_1.SymbolKind.Variable,
			vscode_languageserver_protocol_1.SymbolKind.Constant,
			vscode_languageserver_protocol_1.SymbolKind.String,
			vscode_languageserver_protocol_1.SymbolKind.Number,
			vscode_languageserver_protocol_1.SymbolKind.Boolean,
			vscode_languageserver_protocol_1.SymbolKind.Array,
			vscode_languageserver_protocol_1.SymbolKind.Object,
			vscode_languageserver_protocol_1.SymbolKind.Key,
			vscode_languageserver_protocol_1.SymbolKind.Null,
			vscode_languageserver_protocol_1.SymbolKind.EnumMember,
			vscode_languageserver_protocol_1.SymbolKind.Struct,
			vscode_languageserver_protocol_1.SymbolKind.Event,
			vscode_languageserver_protocol_1.SymbolKind.Operator,
			vscode_languageserver_protocol_1.SymbolKind.TypeParameter,
		];
		let SupportedCompletionItemKinds = [
			vscode_languageserver_protocol_1.CompletionItemKind.Text,
			vscode_languageserver_protocol_1.CompletionItemKind.Method,
			vscode_languageserver_protocol_1.CompletionItemKind.Function,
			vscode_languageserver_protocol_1.CompletionItemKind.Constructor,
			vscode_languageserver_protocol_1.CompletionItemKind.Field,
			vscode_languageserver_protocol_1.CompletionItemKind.Variable,
			vscode_languageserver_protocol_1.CompletionItemKind.Class,
			vscode_languageserver_protocol_1.CompletionItemKind.Interface,
			vscode_languageserver_protocol_1.CompletionItemKind.Module,
			vscode_languageserver_protocol_1.CompletionItemKind.Property,
			vscode_languageserver_protocol_1.CompletionItemKind.Unit,
			vscode_languageserver_protocol_1.CompletionItemKind.Value,
			vscode_languageserver_protocol_1.CompletionItemKind.Enum,
			vscode_languageserver_protocol_1.CompletionItemKind.Keyword,
			vscode_languageserver_protocol_1.CompletionItemKind.Snippet,
			vscode_languageserver_protocol_1.CompletionItemKind.Color,
			vscode_languageserver_protocol_1.CompletionItemKind.File,
			vscode_languageserver_protocol_1.CompletionItemKind.Reference,
			vscode_languageserver_protocol_1.CompletionItemKind.Folder,
			vscode_languageserver_protocol_1.CompletionItemKind.EnumMember,
			vscode_languageserver_protocol_1.CompletionItemKind.Constant,
			vscode_languageserver_protocol_1.CompletionItemKind.Struct,
			vscode_languageserver_protocol_1.CompletionItemKind.Event,
			vscode_languageserver_protocol_1.CompletionItemKind.Operator,
			vscode_languageserver_protocol_1.CompletionItemKind.TypeParameter,
		];
		let SupportedSymbolTags = [
			vscode_languageserver_protocol_1.SymbolTag.Deprecated,
		];
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let FileFormattingOptions;
		(function (FileFormattingOptions2) {
			function fromConfiguration(document2) {
				const filesConfig = vscode_1.workspace.getConfiguration(
					'files',
					document2
				);
				return {
					trimTrailingWhitespace: filesConfig.get('trimTrailingWhitespace'),
					trimFinalNewlines: filesConfig.get('trimFinalNewlines'),
					insertFinalNewline: filesConfig.get('insertFinalNewline'),
				};
			}
			FileFormattingOptions2.fromConfiguration = fromConfiguration;
		})(FileFormattingOptions || (FileFormattingOptions = {}));
		let DynamicFeature;
		(function (DynamicFeature2) {
			function is2(value) {
				let candidate = value;
				return (
					candidate &&
					Is2.func(candidate.register) &&
					Is2.func(candidate.unregister) &&
					Is2.func(candidate.dispose) &&
					candidate.registrationType !== void 0
				);
			}
			DynamicFeature2.is = is2;
		})(DynamicFeature || (DynamicFeature = {}));
		let DocumentNotifications = class {
			constructor(
				_client,
				_event,
				_type,
				_middleware,
				_createParams,
				_selectorFilter
			) {
				this._client = _client;
				this._event = _event;
				this._type = _type;
				this._middleware = _middleware;
				this._createParams = _createParams;
				this._selectorFilter = _selectorFilter;
				this._selectors = new Map();
				this._onNotificationSent = new vscode_1.EventEmitter();
			}
			static textDocumentFilter(selectors, textDocument) {
				for (const selector of selectors) {
					if (vscode_1.languages.match(selector, textDocument)) {
						return true;
					}
				}
				return false;
			}
			register(data) {
				if (!data.registerOptions.documentSelector) {
					return;
				}
				if (!this._listener) {
					this._listener = this._event((data2) => {
						this.callback(data2).catch((error) => {
							this._client.error(
								`Sending document notification ${this._type.method} failed.`,
								error
							);
						});
					});
				}
				this._selectors.set(data.id, data.registerOptions.documentSelector);
			}
			async callback(data) {
				const doSend = async (data2) => {
					const params = this._createParams(data2);
					await this._client.sendNotification(this._type, params).catch();
					this.notificationSent(data2, this._type, params);
				};
				if (
					!this._selectorFilter ||
					this._selectorFilter(this._selectors.values(), data)
				) {
					return this._middleware
						? this._middleware(data, (data2) => doSend(data2))
						: doSend(data);
				}
			}
			get onNotificationSent() {
				return this._onNotificationSent.event;
			}
			notificationSent(data, type, params) {
				this._onNotificationSent.fire({ original: data, type, params });
			}
			unregister(id) {
				this._selectors.delete(id);
				if (this._selectors.size === 0 && this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
			dispose() {
				this._selectors.clear();
				this._onNotificationSent.dispose();
				if (this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
			getProvider(document2) {
				for (const selector of this._selectors.values()) {
					if (vscode_1.languages.match(selector, document2)) {
						return {
							send: (data) => {
								return this.callback(data);
							},
						};
					}
				}
				return void 0;
			}
		};
		let DidOpenTextDocumentFeature = class extends DocumentNotifications {
			constructor(client, _syncedDocuments) {
				super(
					client,
					vscode_1.workspace.onDidOpenTextDocument,
					vscode_languageserver_protocol_1.DidOpenTextDocumentNotification.type,
					client.clientOptions.middleware.didOpen,
					(textDocument) =>
						client.code2ProtocolConverter.asOpenTextDocumentParams(
							textDocument
						),
					DocumentNotifications.textDocumentFilter
				);
				this._syncedDocuments = _syncedDocuments;
			}
			get openDocuments() {
				return this._syncedDocuments.values();
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'synchronization'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				let textDocumentSyncOptions = capabilities.resolvedTextDocumentSync;
				if (
					documentSelector &&
					textDocumentSyncOptions &&
					textDocumentSyncOptions.openClose
				) {
					this.register({
						id: UUID.generateUuid(),
						registerOptions: { documentSelector },
					});
				}
			}
			get registrationType() {
				return vscode_languageserver_protocol_1.DidOpenTextDocumentNotification
					.type;
			}
			register(data) {
				super.register(data);
				if (!data.registerOptions.documentSelector) {
					return;
				}
				let documentSelector = data.registerOptions.documentSelector;
				vscode_1.workspace.textDocuments.forEach((textDocument) => {
					let uri = textDocument.uri.toString();
					if (this._syncedDocuments.has(uri)) {
						return;
					}
					if (vscode_1.languages.match(documentSelector, textDocument)) {
						let middleware = this._client.clientOptions.middleware;
						let didOpen = (textDocument2) => {
							return this._client.sendNotification(
								this._type,
								this._createParams(textDocument2)
							);
						};
						(middleware.didOpen
							? middleware.didOpen(textDocument, didOpen)
							: didOpen(textDocument)
						).catch((error) => {
							this._client.error(
								`Sending document notification ${this._type.method} failed`,
								error
							);
						});
						this._syncedDocuments.set(uri, textDocument);
					}
				});
			}
			notificationSent(textDocument, type, params) {
				super.notificationSent(textDocument, type, params);
				this._syncedDocuments.set(textDocument.uri.toString(), textDocument);
			}
		};
		let DidCloseTextDocumentFeature = class extends DocumentNotifications {
			constructor(client, _syncedDocuments) {
				super(
					client,
					vscode_1.workspace.onDidCloseTextDocument,
					vscode_languageserver_protocol_1.DidCloseTextDocumentNotification
						.type,
					client.clientOptions.middleware.didClose,
					(textDocument) =>
						client.code2ProtocolConverter.asCloseTextDocumentParams(
							textDocument
						),
					DocumentNotifications.textDocumentFilter
				);
				this._syncedDocuments = _syncedDocuments;
			}
			get registrationType() {
				return vscode_languageserver_protocol_1.DidCloseTextDocumentNotification
					.type;
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'synchronization'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				let textDocumentSyncOptions = capabilities.resolvedTextDocumentSync;
				if (
					documentSelector &&
					textDocumentSyncOptions &&
					textDocumentSyncOptions.openClose
				) {
					this.register({
						id: UUID.generateUuid(),
						registerOptions: { documentSelector },
					});
				}
			}
			notificationSent(textDocument, type, params) {
				super.notificationSent(textDocument, type, params);
				this._syncedDocuments.delete(textDocument.uri.toString());
			}
			unregister(id) {
				let selector = this._selectors.get(id);
				super.unregister(id);
				let selectors = this._selectors.values();
				this._syncedDocuments.forEach((textDocument) => {
					if (
						vscode_1.languages.match(selector, textDocument) &&
						!this._selectorFilter(selectors, textDocument)
					) {
						let middleware = this._client.clientOptions.middleware;
						let didClose = (textDocument2) => {
							return this._client.sendNotification(
								this._type,
								this._createParams(textDocument2)
							);
						};
						this._syncedDocuments.delete(textDocument.uri.toString());
						(middleware.didClose
							? middleware.didClose(textDocument, didClose)
							: didClose(textDocument)
						).catch((error) => {
							this._client.error(
								`Sending document notification ${this._type.method} failed`,
								error
							);
						});
					}
				});
			}
		};
		let DidChangeTextDocumentFeature = class {
			constructor(_client) {
				this._client = _client;
				this._changeData = new Map();
				this._forcingDelivery = false;
				this._onNotificationSent = new vscode_1.EventEmitter();
			}
			get registrationType() {
				return vscode_languageserver_protocol_1
					.DidChangeTextDocumentNotification.type;
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'synchronization'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				let textDocumentSyncOptions = capabilities.resolvedTextDocumentSync;
				if (
					documentSelector &&
					textDocumentSyncOptions &&
					textDocumentSyncOptions.change !== void 0 &&
					textDocumentSyncOptions.change !==
						vscode_languageserver_protocol_1.TextDocumentSyncKind.None
				) {
					this.register({
						id: UUID.generateUuid(),
						registerOptions: Object.assign(
							{},
							{ documentSelector },
							{ syncKind: textDocumentSyncOptions.change }
						),
					});
				}
			}
			register(data) {
				if (!data.registerOptions.documentSelector) {
					return;
				}
				if (!this._listener) {
					this._listener = vscode_1.workspace.onDidChangeTextDocument(
						this.callback,
						this
					);
				}
				this._changeData.set(data.id, {
					documentSelector: data.registerOptions.documentSelector,
					syncKind: data.registerOptions.syncKind,
				});
			}
			async callback(event) {
				if (event.contentChanges.length === 0) {
					return;
				}
				const promises = [];
				for (const changeData of this._changeData.values()) {
					if (
						vscode_1.languages.match(
							changeData.documentSelector,
							event.document
						)
					) {
						const middleware = this._client.clientOptions.middleware;
						if (
							changeData.syncKind ===
							vscode_languageserver_protocol_1.TextDocumentSyncKind.Incremental
						) {
							const didChange = async (event2) => {
								const params = this._client.code2ProtocolConverter.asChangeTextDocumentParams(
									event2
								);
								await this._client.sendNotification(
									vscode_languageserver_protocol_1
										.DidChangeTextDocumentNotification.type,
									params
								);
								this.notificationSent(
									event2,
									vscode_languageserver_protocol_1
										.DidChangeTextDocumentNotification.type,
									params
								);
							};
							promises.push(
								middleware.didChange
									? middleware.didChange(event, (event2) => didChange(event2))
									: didChange(event)
							);
						} else if (
							changeData.syncKind ===
							vscode_languageserver_protocol_1.TextDocumentSyncKind.Full
						) {
							const didChange = async (event2) => {
								const doSend = async (event3) => {
									const params = this._client.code2ProtocolConverter.asChangeTextDocumentParams(
										event3.document
									);
									await this._client.sendNotification(
										vscode_languageserver_protocol_1
											.DidChangeTextDocumentNotification.type,
										params
									);
									this.notificationSent(
										event3,
										vscode_languageserver_protocol_1
											.DidChangeTextDocumentNotification.type,
										params
									);
								};
								if (this._changeDelayer) {
									if (
										this._changeDelayer.uri !== event2.document.uri.toString()
									) {
										this.forceDelivery();
										this._changeDelayer.uri = event2.document.uri.toString();
									}
									return this._changeDelayer.delayer.trigger(() =>
										doSend(event2)
									);
								} else {
									this._changeDelayer = {
										uri: event2.document.uri.toString(),
										delayer: new async_1.Delayer(200),
									};
									return this._changeDelayer.delayer.trigger(
										() => doSend(event2),
										-1
									);
								}
							};
							promises.push(
								middleware.didChange
									? middleware.didChange(event, (event2) => didChange(event2))
									: didChange(event)
							);
						}
					}
				}
				return Promise.all(promises).then(void 0, (error) => {
					this._client.error(
						`Sending document notification ${vscode_languageserver_protocol_1.DidChangeTextDocumentNotification.type.method} failed`,
						error
					);
					throw error;
				});
			}
			get onNotificationSent() {
				return this._onNotificationSent.event;
			}
			notificationSent(changeEvent, type, params) {
				this._onNotificationSent.fire({ original: changeEvent, type, params });
			}
			unregister(id) {
				this._changeData.delete(id);
				if (this._changeData.size === 0 && this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
			dispose() {
				this._changeDelayer = void 0;
				this._forcingDelivery = false;
				this._changeData.clear();
				if (this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
			forceDelivery() {
				if (this._forcingDelivery || !this._changeDelayer) {
					return;
				}
				try {
					this._forcingDelivery = true;
					this._changeDelayer.delayer.forceDelivery();
				} finally {
					this._forcingDelivery = false;
				}
			}
			getProvider(document2) {
				for (const changeData of this._changeData.values()) {
					if (
						vscode_1.languages.match(changeData.documentSelector, document2)
					) {
						return {
							send: (event) => {
								return this.callback(event);
							},
						};
					}
				}
				return void 0;
			}
		};
		let WillSaveFeature = class extends DocumentNotifications {
			constructor(client) {
				super(
					client,
					vscode_1.workspace.onWillSaveTextDocument,
					vscode_languageserver_protocol_1.WillSaveTextDocumentNotification
						.type,
					client.clientOptions.middleware.willSave,
					(willSaveEvent) =>
						client.code2ProtocolConverter.asWillSaveTextDocumentParams(
							willSaveEvent
						),
					(selectors, willSaveEvent) =>
						DocumentNotifications.textDocumentFilter(
							selectors,
							willSaveEvent.document
						)
				);
			}
			get registrationType() {
				return vscode_languageserver_protocol_1.WillSaveTextDocumentNotification
					.type;
			}
			fillClientCapabilities(capabilities) {
				let value = ensure(
					ensure(capabilities, 'textDocument'),
					'synchronization'
				);
				value.willSave = true;
			}
			initialize(capabilities, documentSelector) {
				let textDocumentSyncOptions = capabilities.resolvedTextDocumentSync;
				if (
					documentSelector &&
					textDocumentSyncOptions &&
					textDocumentSyncOptions.willSave
				) {
					this.register({
						id: UUID.generateUuid(),
						registerOptions: { documentSelector },
					});
				}
			}
		};
		let WillSaveWaitUntilFeature = class {
			constructor(_client) {
				this._client = _client;
				this._selectors = new Map();
			}
			get registrationType() {
				return vscode_languageserver_protocol_1
					.WillSaveTextDocumentWaitUntilRequest.type;
			}
			fillClientCapabilities(capabilities) {
				let value = ensure(
					ensure(capabilities, 'textDocument'),
					'synchronization'
				);
				value.willSaveWaitUntil = true;
			}
			initialize(capabilities, documentSelector) {
				let textDocumentSyncOptions = capabilities.resolvedTextDocumentSync;
				if (
					documentSelector &&
					textDocumentSyncOptions &&
					textDocumentSyncOptions.willSaveWaitUntil
				) {
					this.register({
						id: UUID.generateUuid(),
						registerOptions: { documentSelector },
					});
				}
			}
			register(data) {
				if (!data.registerOptions.documentSelector) {
					return;
				}
				if (!this._listener) {
					this._listener = vscode_1.workspace.onWillSaveTextDocument(
						this.callback,
						this
					);
				}
				this._selectors.set(data.id, data.registerOptions.documentSelector);
			}
			callback(event) {
				if (
					DocumentNotifications.textDocumentFilter(
						this._selectors.values(),
						event.document
					)
				) {
					let middleware = this._client.clientOptions.middleware;
					let willSaveWaitUntil = (event2) => {
						return this._client
							.sendRequest(
								vscode_languageserver_protocol_1
									.WillSaveTextDocumentWaitUntilRequest.type,
								this._client.code2ProtocolConverter.asWillSaveTextDocumentParams(
									event2
								)
							)
							.then((edits) => {
								let vEdits = this._client.protocol2CodeConverter.asTextEdits(
									edits
								);
								return vEdits === void 0 ? [] : vEdits;
							});
					};
					event.waitUntil(
						middleware.willSaveWaitUntil
							? middleware.willSaveWaitUntil(event, willSaveWaitUntil)
							: willSaveWaitUntil(event)
					);
				}
			}
			unregister(id) {
				this._selectors.delete(id);
				if (this._selectors.size === 0 && this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
			dispose() {
				this._selectors.clear();
				if (this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
		};
		let DidSaveTextDocumentFeature = class extends DocumentNotifications {
			constructor(client) {
				super(
					client,
					vscode_1.workspace.onDidSaveTextDocument,
					vscode_languageserver_protocol_1.DidSaveTextDocumentNotification.type,
					client.clientOptions.middleware.didSave,
					(textDocument) =>
						client.code2ProtocolConverter.asSaveTextDocumentParams(
							textDocument,
							this._includeText
						),
					DocumentNotifications.textDocumentFilter
				);
				this._includeText = false;
			}
			get registrationType() {
				return vscode_languageserver_protocol_1.DidSaveTextDocumentNotification
					.type;
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'synchronization'
				).didSave = true;
			}
			initialize(capabilities, documentSelector) {
				const textDocumentSyncOptions = capabilities.resolvedTextDocumentSync;
				if (
					documentSelector &&
					textDocumentSyncOptions &&
					textDocumentSyncOptions.save
				) {
					const saveOptions =
						typeof textDocumentSyncOptions.save === 'boolean'
							? { includeText: false }
							: { includeText: !!textDocumentSyncOptions.save.includeText };
					this.register({
						id: UUID.generateUuid(),
						registerOptions: Object.assign(
							{},
							{ documentSelector },
							saveOptions
						),
					});
				}
			}
			register(data) {
				this._includeText = !!data.registerOptions.includeText;
				super.register(data);
			}
		};
		let FileSystemWatcherFeature = class {
			constructor(_client, _notifyFileEvent) {
				this._client = _client;
				this._notifyFileEvent = _notifyFileEvent;
				this._watchers = new Map();
			}
			get registrationType() {
				return vscode_languageserver_protocol_1
					.DidChangeWatchedFilesNotification.type;
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'workspace'),
					'didChangeWatchedFiles'
				).dynamicRegistration = true;
			}
			initialize(_capabilities, _documentSelector) {}
			register(data) {
				if (!Array.isArray(data.registerOptions.watchers)) {
					return;
				}
				let disposables = [];
				for (let watcher of data.registerOptions.watchers) {
					if (!Is2.string(watcher.globPattern)) {
						continue;
					}
					let watchCreate = true,
						watchChange = true,
						watchDelete = true;
					if (watcher.kind !== void 0 && watcher.kind !== null) {
						watchCreate =
							(watcher.kind &
								vscode_languageserver_protocol_1.WatchKind.Create) !==
							0;
						watchChange =
							(watcher.kind &
								vscode_languageserver_protocol_1.WatchKind.Change) !==
							0;
						watchDelete =
							(watcher.kind &
								vscode_languageserver_protocol_1.WatchKind.Delete) !==
							0;
					}
					let fileSystemWatcher = vscode_1.workspace.createFileSystemWatcher(
						watcher.globPattern,
						!watchCreate,
						!watchChange,
						!watchDelete
					);
					this.hookListeners(
						fileSystemWatcher,
						watchCreate,
						watchChange,
						watchDelete
					);
					disposables.push(fileSystemWatcher);
				}
				this._watchers.set(data.id, disposables);
			}
			registerRaw(id, fileSystemWatchers) {
				let disposables = [];
				for (let fileSystemWatcher of fileSystemWatchers) {
					this.hookListeners(fileSystemWatcher, true, true, true, disposables);
				}
				this._watchers.set(id, disposables);
			}
			hookListeners(
				fileSystemWatcher,
				watchCreate,
				watchChange,
				watchDelete,
				listeners
			) {
				if (watchCreate) {
					fileSystemWatcher.onDidCreate(
						(resource) =>
							this._notifyFileEvent({
								uri: this._client.code2ProtocolConverter.asUri(resource),
								type: vscode_languageserver_protocol_1.FileChangeType.Created,
							}),
						null,
						listeners
					);
				}
				if (watchChange) {
					fileSystemWatcher.onDidChange(
						(resource) =>
							this._notifyFileEvent({
								uri: this._client.code2ProtocolConverter.asUri(resource),
								type: vscode_languageserver_protocol_1.FileChangeType.Changed,
							}),
						null,
						listeners
					);
				}
				if (watchDelete) {
					fileSystemWatcher.onDidDelete(
						(resource) =>
							this._notifyFileEvent({
								uri: this._client.code2ProtocolConverter.asUri(resource),
								type: vscode_languageserver_protocol_1.FileChangeType.Deleted,
							}),
						null,
						listeners
					);
				}
			}
			unregister(id) {
				let disposables = this._watchers.get(id);
				if (disposables) {
					for (let disposable of disposables) {
						disposable.dispose();
					}
				}
			}
			dispose() {
				this._watchers.forEach((disposables) => {
					for (let disposable of disposables) {
						disposable.dispose();
					}
				});
				this._watchers.clear();
			}
		};
		let TextDocumentFeature = class {
			constructor(_client, _registrationType) {
				this._client = _client;
				this._registrationType = _registrationType;
				this._registrations = new Map();
			}
			get registrationType() {
				return this._registrationType;
			}
			register(data) {
				if (!data.registerOptions.documentSelector) {
					return;
				}
				let registration = this.registerLanguageProvider(
					data.registerOptions,
					data.id
				);
				this._registrations.set(data.id, {
					disposable: registration[0],
					data,
					provider: registration[1],
				});
			}
			unregister(id) {
				let registration = this._registrations.get(id);
				if (registration !== void 0) {
					registration.disposable.dispose();
				}
			}
			dispose() {
				this._registrations.forEach((value) => {
					value.disposable.dispose();
				});
				this._registrations.clear();
			}
			getRegistration(documentSelector, capability) {
				if (!capability) {
					return [void 0, void 0];
				} else if (
					vscode_languageserver_protocol_1.TextDocumentRegistrationOptions.is(
						capability
					)
				) {
					const id = vscode_languageserver_protocol_1.StaticRegistrationOptions.hasId(
						capability
					)
						? capability.id
						: UUID.generateUuid();
					const selector = capability.documentSelector || documentSelector;
					if (selector) {
						return [
							id,
							Object.assign({}, capability, { documentSelector: selector }),
						];
					}
				} else if (
					(Is2.boolean(capability) && capability === true) ||
					vscode_languageserver_protocol_1.WorkDoneProgressOptions.is(
						capability
					)
				) {
					if (!documentSelector) {
						return [void 0, void 0];
					}
					let options =
						Is2.boolean(capability) && capability === true
							? { documentSelector }
							: Object.assign({}, capability, { documentSelector });
					return [UUID.generateUuid(), options];
				}
				return [void 0, void 0];
			}
			getRegistrationOptions(documentSelector, capability) {
				if (!documentSelector || !capability) {
					return void 0;
				}
				return Is2.boolean(capability) && capability === true
					? { documentSelector }
					: Object.assign({}, capability, { documentSelector });
			}
			getProvider(textDocument) {
				for (const registration of this._registrations.values()) {
					let selector = registration.data.registerOptions.documentSelector;
					if (
						selector !== null &&
						vscode_1.languages.match(selector, textDocument)
					) {
						return registration.provider;
					}
				}
				return void 0;
			}
			getAllProviders() {
				const result = [];
				for (const item of this._registrations.values()) {
					result.push(item.provider);
				}
				return result;
			}
		};
		exports.TextDocumentFeature = TextDocumentFeature;
		let WorkspaceFeature = class {
			constructor(_client, _registrationType) {
				this._client = _client;
				this._registrationType = _registrationType;
				this._registrations = new Map();
			}
			get registrationType() {
				return this._registrationType;
			}
			register(data) {
				const registration = this.registerLanguageProvider(
					data.registerOptions
				);
				this._registrations.set(data.id, {
					disposable: registration[0],
					provider: registration[1],
				});
			}
			unregister(id) {
				let registration = this._registrations.get(id);
				if (registration !== void 0) {
					registration.disposable.dispose();
				}
			}
			dispose() {
				this._registrations.forEach((registration) => {
					registration.disposable.dispose();
				});
				this._registrations.clear();
			}
			getProviders() {
				const result = [];
				for (const registration of this._registrations.values()) {
					result.push(registration.provider);
				}
				return result;
			}
		};
		let CompletionItemFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.CompletionRequest.type);
				this.labelDetailsSupport = new Map();
			}
			fillClientCapabilities(capabilities) {
				let completion = ensure(
					ensure(capabilities, 'textDocument'),
					'completion'
				);
				completion.dynamicRegistration = true;
				completion.contextSupport = true;
				completion.completionItem = {
					snippetSupport: true,
					commitCharactersSupport: true,
					documentationFormat: [
						vscode_languageserver_protocol_1.MarkupKind.Markdown,
						vscode_languageserver_protocol_1.MarkupKind.PlainText,
					],
					deprecatedSupport: true,
					preselectSupport: true,
					tagSupport: {
						valueSet: [
							vscode_languageserver_protocol_1.CompletionItemTag.Deprecated,
						],
					},
					insertReplaceSupport: true,
					resolveSupport: {
						properties: ['documentation', 'detail', 'additionalTextEdits'],
					},
					insertTextModeSupport: {
						valueSet: [
							vscode_languageserver_protocol_1.InsertTextMode.asIs,
							vscode_languageserver_protocol_1.InsertTextMode.adjustIndentation,
						],
					},
					labelDetailsSupport: true,
				};
				completion.insertTextMode =
					vscode_languageserver_protocol_1.InsertTextMode.adjustIndentation;
				completion.completionItemKind = {
					valueSet: SupportedCompletionItemKinds,
				};
				completion.completionList = {
					itemDefaults: [
						'commitCharacters',
						'editRange',
						'insertTextFormat',
						'insertTextMode',
					],
				};
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.completionProvider
				);
				if (!options) {
					return;
				}
				this.register({
					id: UUID.generateUuid(),
					registerOptions: options,
				});
			}
			registerLanguageProvider(options, id) {
				this.labelDetailsSupport.set(
					id,
					!!options.completionItem?.labelDetailsSupport
				);
				const triggerCharacters = options.triggerCharacters ?? [];
				const defaultCommitCharacters = options.allCommitCharacters;
				const provider = {
					provideCompletionItems: (document2, position, token, context) => {
						const client = this._client;
						const middleware = this._client.clientOptions.middleware;
						const provideCompletionItems = (
							document3,
							position2,
							context2,
							token2
						) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.CompletionRequest.type,
									client.code2ProtocolConverter.asCompletionParams(
										document3,
										position2,
										context2
									),
									token2
								)
								.then(
									(result) =>
										client.protocol2CodeConverter.asCompletionResult(
											result,
											defaultCommitCharacters
										),
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.CompletionRequest.type,
											token2,
											error,
											null
										);
									}
								);
						};
						return middleware.provideCompletionItem
							? middleware.provideCompletionItem(
									document2,
									position,
									context,
									token,
									provideCompletionItems
							  )
							: provideCompletionItems(document2, position, context, token);
					},
					resolveCompletionItem: options.resolveProvider
						? (item, token) => {
								const client = this._client;
								const middleware = this._client.clientOptions.middleware;
								const resolveCompletionItem = (item2, token2) => {
									return client
										.sendRequest(
											vscode_languageserver_protocol_1.CompletionResolveRequest
												.type,
											client.code2ProtocolConverter.asCompletionItem(
												item2,
												!!this.labelDetailsSupport.get(id)
											),
											token2
										)
										.then(
											client.protocol2CodeConverter.asCompletionItem,
											(error) => {
												return client.handleFailedRequest(
													vscode_languageserver_protocol_1
														.CompletionResolveRequest.type,
													token2,
													error,
													item2
												);
											}
										);
								};
								return middleware.resolveCompletionItem
									? middleware.resolveCompletionItem(
											item,
											token,
											resolveCompletionItem
									  )
									: resolveCompletionItem(item, token);
						  }
						: void 0,
				};
				return [
					vscode_1.languages.registerCompletionItemProvider(
						options.documentSelector,
						provider,
						...triggerCharacters
					),
					provider,
				];
			}
		};
		let HoverFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.HoverRequest.type);
			}
			fillClientCapabilities(capabilities) {
				const hoverCapability = ensure(
					ensure(capabilities, 'textDocument'),
					'hover'
				);
				hoverCapability.dynamicRegistration = true;
				hoverCapability.contentFormat = [
					vscode_languageserver_protocol_1.MarkupKind.Markdown,
					vscode_languageserver_protocol_1.MarkupKind.PlainText,
				];
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.hoverProvider
				);
				if (!options) {
					return;
				}
				this.register({
					id: UUID.generateUuid(),
					registerOptions: options,
				});
			}
			registerLanguageProvider(options) {
				const provider = {
					provideHover: (document2, position, token) => {
						const client = this._client;
						const provideHover = (document3, position2, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.HoverRequest.type,
									client.code2ProtocolConverter.asTextDocumentPositionParams(
										document3,
										position2
									),
									token2
								)
								.then(client.protocol2CodeConverter.asHover, (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1.HoverRequest.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideHover
							? middleware.provideHover(
									document2,
									position,
									token,
									provideHover
							  )
							: provideHover(document2, position, token);
					},
				};
				return [
					vscode_1.languages.registerHoverProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		let SignatureHelpFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.SignatureHelpRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				let config = ensure(
					ensure(capabilities, 'textDocument'),
					'signatureHelp'
				);
				config.dynamicRegistration = true;
				config.signatureInformation = {
					documentationFormat: [
						vscode_languageserver_protocol_1.MarkupKind.Markdown,
						vscode_languageserver_protocol_1.MarkupKind.PlainText,
					],
				};
				config.signatureInformation.parameterInformation = {
					labelOffsetSupport: true,
				};
				config.signatureInformation.activeParameterSupport = true;
				config.contextSupport = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.signatureHelpProvider
				);
				if (!options) {
					return;
				}
				this.register({
					id: UUID.generateUuid(),
					registerOptions: options,
				});
			}
			registerLanguageProvider(options) {
				const provider = {
					provideSignatureHelp: (document2, position, token, context) => {
						const client = this._client;
						const providerSignatureHelp = (
							document3,
							position2,
							context2,
							token2
						) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.SignatureHelpRequest.type,
									client.code2ProtocolConverter.asSignatureHelpParams(
										document3,
										position2,
										context2
									),
									token2
								)
								.then(
									client.protocol2CodeConverter.asSignatureHelp,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.SignatureHelpRequest
												.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideSignatureHelp
							? middleware.provideSignatureHelp(
									document2,
									position,
									context,
									token,
									providerSignatureHelp
							  )
							: providerSignatureHelp(document2, position, context, token);
					},
				};
				let disposable;
				if (options.retriggerCharacters === void 0) {
					const triggerCharacters = options.triggerCharacters || [];
					disposable = vscode_1.languages.registerSignatureHelpProvider(
						options.documentSelector,
						provider,
						...triggerCharacters
					);
				} else {
					const metaData = {
						triggerCharacters: options.triggerCharacters || [],
						retriggerCharacters: options.retriggerCharacters || [],
					};
					disposable = vscode_1.languages.registerSignatureHelpProvider(
						options.documentSelector,
						provider,
						metaData
					);
				}
				return [disposable, provider];
			}
		};
		let DefinitionFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.DefinitionRequest.type);
			}
			fillClientCapabilities(capabilities) {
				let definitionSupport = ensure(
					ensure(capabilities, 'textDocument'),
					'definition'
				);
				definitionSupport.dynamicRegistration = true;
				definitionSupport.linkSupport = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.definitionProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideDefinition: (document2, position, token) => {
						const client = this._client;
						const provideDefinition = (document3, position2, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.DefinitionRequest.type,
									client.code2ProtocolConverter.asTextDocumentPositionParams(
										document3,
										position2
									),
									token2
								)
								.then(
									client.protocol2CodeConverter.asDefinitionResult,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.DefinitionRequest.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDefinition
							? middleware.provideDefinition(
									document2,
									position,
									token,
									provideDefinition
							  )
							: provideDefinition(document2, position, token);
					},
				};
				return [
					vscode_1.languages.registerDefinitionProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		let ReferencesFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.ReferencesRequest.type);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'references'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.referencesProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideReferences: (document2, position, options2, token) => {
						const client = this._client;
						const _providerReferences = (
							document3,
							position2,
							options3,
							token2
						) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.ReferencesRequest.type,
									client.code2ProtocolConverter.asReferenceParams(
										document3,
										position2,
										options3
									),
									token2
								)
								.then(client.protocol2CodeConverter.asReferences, (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1.ReferencesRequest.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideReferences
							? middleware.provideReferences(
									document2,
									position,
									options2,
									token,
									_providerReferences
							  )
							: _providerReferences(document2, position, options2, token);
					},
				};
				return [
					vscode_1.languages.registerReferenceProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		let DocumentHighlightFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.DocumentHighlightRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'documentHighlight'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.documentHighlightProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideDocumentHighlights: (document2, position, token) => {
						const client = this._client;
						const _provideDocumentHighlights = (
							document3,
							position2,
							token2
						) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.DocumentHighlightRequest
										.type,
									client.code2ProtocolConverter.asTextDocumentPositionParams(
										document3,
										position2
									),
									token2
								)
								.then(
									client.protocol2CodeConverter.asDocumentHighlights,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.DocumentHighlightRequest
												.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDocumentHighlights
							? middleware.provideDocumentHighlights(
									document2,
									position,
									token,
									_provideDocumentHighlights
							  )
							: _provideDocumentHighlights(document2, position, token);
					},
				};
				return [
					vscode_1.languages.registerDocumentHighlightProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		let DocumentSymbolFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.DocumentSymbolRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				let symbolCapabilities = ensure(
					ensure(capabilities, 'textDocument'),
					'documentSymbol'
				);
				symbolCapabilities.dynamicRegistration = true;
				symbolCapabilities.symbolKind = {
					valueSet: SupportedSymbolKinds,
				};
				symbolCapabilities.hierarchicalDocumentSymbolSupport = true;
				symbolCapabilities.tagSupport = {
					valueSet: SupportedSymbolTags,
				};
				symbolCapabilities.labelSupport = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.documentSymbolProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideDocumentSymbols: (document2, token) => {
						const client = this._client;
						const _provideDocumentSymbols = (document3, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.DocumentSymbolRequest.type,
									client.code2ProtocolConverter.asDocumentSymbolParams(
										document3
									),
									token2
								)
								.then(
									(data) => {
										if (data === null) {
											return void 0;
										}
										if (data.length === 0) {
											return [];
										} else {
											let element = data[0];
											if (
												vscode_languageserver_protocol_1.DocumentSymbol.is(
													element
												)
											) {
												return client.protocol2CodeConverter.asDocumentSymbols(
													data
												);
											} else {
												return client.protocol2CodeConverter.asSymbolInformations(
													data
												);
											}
										}
									},
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.DocumentSymbolRequest
												.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDocumentSymbols
							? middleware.provideDocumentSymbols(
									document2,
									token,
									_provideDocumentSymbols
							  )
							: _provideDocumentSymbols(document2, token);
					},
				};
				const metaData =
					options.label !== void 0 ? { label: options.label } : void 0;
				return [
					vscode_1.languages.registerDocumentSymbolProvider(
						options.documentSelector,
						provider,
						metaData
					),
					provider,
				];
			}
		};
		let WorkspaceSymbolFeature = class extends WorkspaceFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.WorkspaceSymbolRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				let symbolCapabilities = ensure(
					ensure(capabilities, 'workspace'),
					'symbol'
				);
				symbolCapabilities.dynamicRegistration = true;
				symbolCapabilities.symbolKind = {
					valueSet: SupportedSymbolKinds,
				};
				symbolCapabilities.tagSupport = {
					valueSet: SupportedSymbolTags,
				};
				symbolCapabilities.resolveSupport = { properties: ['location.range'] };
			}
			initialize(capabilities) {
				if (!capabilities.workspaceSymbolProvider) {
					return;
				}
				this.register({
					id: UUID.generateUuid(),
					registerOptions:
						capabilities.workspaceSymbolProvider === true
							? { workDoneProgress: false }
							: capabilities.workspaceSymbolProvider,
				});
			}
			registerLanguageProvider(options) {
				const provider = {
					provideWorkspaceSymbols: (query, token) => {
						const client = this._client;
						const provideWorkspaceSymbols = (query2, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.WorkspaceSymbolRequest.type,
									{ query: query2 },
									token2
								)
								.then(
									client.protocol2CodeConverter.asSymbolInformations,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.WorkspaceSymbolRequest
												.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideWorkspaceSymbols
							? middleware.provideWorkspaceSymbols(
									query,
									token,
									provideWorkspaceSymbols
							  )
							: provideWorkspaceSymbols(query, token);
					},
					resolveWorkspaceSymbol:
						options.resolveProvider === true
							? (item, token) => {
									const client = this._client;
									const resolveWorkspaceSymbol = (item2, token2) => {
										return client
											.sendRequest(
												vscode_languageserver_protocol_1
													.WorkspaceSymbolResolveRequest.type,
												client.code2ProtocolConverter.asWorkspaceSymbol(item2),
												token2
											)
											.then(
												client.protocol2CodeConverter.asSymbolInformation,
												(error) => {
													return client.handleFailedRequest(
														vscode_languageserver_protocol_1
															.WorkspaceSymbolResolveRequest.type,
														token2,
														error,
														null
													);
												}
											);
									};
									const middleware = client.clientOptions.middleware;
									return middleware.resolveWorkspaceSymbol
										? middleware.resolveWorkspaceSymbol(
												item,
												token,
												resolveWorkspaceSymbol
										  )
										: resolveWorkspaceSymbol(item, token);
							  }
							: void 0,
				};
				return [
					vscode_1.languages.registerWorkspaceSymbolProvider(provider),
					provider,
				];
			}
		};
		let CodeActionFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.CodeActionRequest.type);
			}
			fillClientCapabilities(capabilities) {
				const cap = ensure(ensure(capabilities, 'textDocument'), 'codeAction');
				cap.dynamicRegistration = true;
				cap.isPreferredSupport = true;
				cap.disabledSupport = true;
				cap.dataSupport = true;
				cap.resolveSupport = {
					properties: ['edit'],
				};
				cap.codeActionLiteralSupport = {
					codeActionKind: {
						valueSet: [
							vscode_languageserver_protocol_1.CodeActionKind.Empty,
							vscode_languageserver_protocol_1.CodeActionKind.QuickFix,
							vscode_languageserver_protocol_1.CodeActionKind.Refactor,
							vscode_languageserver_protocol_1.CodeActionKind.RefactorExtract,
							vscode_languageserver_protocol_1.CodeActionKind.RefactorInline,
							vscode_languageserver_protocol_1.CodeActionKind.RefactorRewrite,
							vscode_languageserver_protocol_1.CodeActionKind.Source,
							vscode_languageserver_protocol_1.CodeActionKind
								.SourceOrganizeImports,
						],
					},
				};
				cap.honorsChangeAnnotations = false;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.codeActionProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideCodeActions: (document2, range, context, token) => {
						const client = this._client;
						const _provideCodeActions = (
							document3,
							range2,
							context2,
							token2
						) => {
							const params = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
								range: client.code2ProtocolConverter.asRange(range2),
								context: client.code2ProtocolConverter.asCodeActionContext(
									context2
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.CodeActionRequest.type,
									params,
									token2
								)
								.then(
									(values) => {
										if (values === null) {
											return void 0;
										}
										const result = [];
										for (let item of values) {
											if (vscode_languageserver_protocol_1.Command.is(item)) {
												result.push(
													client.protocol2CodeConverter.asCommand(item)
												);
											} else {
												result.push(
													client.protocol2CodeConverter.asCodeAction(item)
												);
											}
										}
										return result;
									},
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.CodeActionRequest.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideCodeActions
							? middleware.provideCodeActions(
									document2,
									range,
									context,
									token,
									_provideCodeActions
							  )
							: _provideCodeActions(document2, range, context, token);
					},
					resolveCodeAction: options.resolveProvider
						? (item, token) => {
								const client = this._client;
								const middleware = this._client.clientOptions.middleware;
								const resolveCodeAction = (item2, token2) => {
									return client
										.sendRequest(
											vscode_languageserver_protocol_1.CodeActionResolveRequest
												.type,
											client.code2ProtocolConverter.asCodeAction(item2),
											token2
										)
										.then(
											client.protocol2CodeConverter.asCodeAction,
											(error) => {
												return client.handleFailedRequest(
													vscode_languageserver_protocol_1
														.CodeActionResolveRequest.type,
													token2,
													error,
													item2
												);
											}
										);
								};
								return middleware.resolveCodeAction
									? middleware.resolveCodeAction(item, token, resolveCodeAction)
									: resolveCodeAction(item, token);
						  }
						: void 0,
				};
				return [
					vscode_1.languages.registerCodeActionsProvider(
						options.documentSelector,
						provider,
						options.codeActionKinds
							? {
									providedCodeActionKinds: this._client.protocol2CodeConverter.asCodeActionKinds(
										options.codeActionKinds
									),
							  }
							: void 0
					),
					provider,
				];
			}
		};
		let CodeLensFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.CodeLensRequest.type);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'codeLens'
				).dynamicRegistration = true;
				ensure(
					ensure(capabilities, 'workspace'),
					'codeLens'
				).refreshSupport = true;
			}
			initialize(capabilities, documentSelector) {
				const client = this._client;
				client.onRequest(
					vscode_languageserver_protocol_1.CodeLensRefreshRequest.type,
					async () => {
						for (const provider of this.getAllProviders()) {
							provider.onDidChangeCodeLensEmitter.fire();
						}
					}
				);
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.codeLensProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const eventEmitter = new vscode_1.EventEmitter();
				const provider = {
					onDidChangeCodeLenses: eventEmitter.event,
					provideCodeLenses: (document2, token) => {
						const client = this._client;
						const provideCodeLenses = (document3, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.CodeLensRequest.type,
									client.code2ProtocolConverter.asCodeLensParams(document3),
									token2
								)
								.then(client.protocol2CodeConverter.asCodeLenses, (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1.CodeLensRequest.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideCodeLenses
							? middleware.provideCodeLenses(
									document2,
									token,
									provideCodeLenses
							  )
							: provideCodeLenses(document2, token);
					},
					resolveCodeLens: options.resolveProvider
						? (codeLens, token) => {
								const client = this._client;
								const resolveCodeLens = (codeLens2, token2) => {
									return client
										.sendRequest(
											vscode_languageserver_protocol_1.CodeLensResolveRequest
												.type,
											client.code2ProtocolConverter.asCodeLens(codeLens2),
											token2
										)
										.then(client.protocol2CodeConverter.asCodeLens, (error) => {
											return client.handleFailedRequest(
												vscode_languageserver_protocol_1.CodeLensResolveRequest
													.type,
												token2,
												error,
												codeLens2
											);
										});
								};
								const middleware = client.clientOptions.middleware;
								return middleware.resolveCodeLens
									? middleware.resolveCodeLens(codeLens, token, resolveCodeLens)
									: resolveCodeLens(codeLens, token);
						  }
						: void 0,
				};
				return [
					vscode_1.languages.registerCodeLensProvider(
						options.documentSelector,
						provider
					),
					{ provider, onDidChangeCodeLensEmitter: eventEmitter },
				];
			}
		};
		let DocumentFormattingFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.DocumentFormattingRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'formatting'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.documentFormattingProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideDocumentFormattingEdits: (document2, options2, token) => {
						const client = this._client;
						const provideDocumentFormattingEdits = (
							document3,
							options3,
							token2
						) => {
							const params = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
								options: client.code2ProtocolConverter.asFormattingOptions(
									options3,
									FileFormattingOptions.fromConfiguration(document3)
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.DocumentFormattingRequest
										.type,
									params,
									token2
								)
								.then(client.protocol2CodeConverter.asTextEdits, (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1.DocumentFormattingRequest
											.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDocumentFormattingEdits
							? middleware.provideDocumentFormattingEdits(
									document2,
									options2,
									token,
									provideDocumentFormattingEdits
							  )
							: provideDocumentFormattingEdits(document2, options2, token);
					},
				};
				return [
					vscode_1.languages.registerDocumentFormattingEditProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		let DocumentRangeFormattingFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.DocumentRangeFormattingRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'rangeFormatting'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.documentRangeFormattingProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideDocumentRangeFormattingEdits: (
						document2,
						range,
						options2,
						token
					) => {
						const client = this._client;
						const provideDocumentRangeFormattingEdits = (
							document3,
							range2,
							options3,
							token2
						) => {
							const params = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
								range: client.code2ProtocolConverter.asRange(range2),
								options: client.code2ProtocolConverter.asFormattingOptions(
									options3,
									FileFormattingOptions.fromConfiguration(document3)
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1
										.DocumentRangeFormattingRequest.type,
									params,
									token2
								)
								.then(client.protocol2CodeConverter.asTextEdits, (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1
											.DocumentRangeFormattingRequest.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDocumentRangeFormattingEdits
							? middleware.provideDocumentRangeFormattingEdits(
									document2,
									range,
									options2,
									token,
									provideDocumentRangeFormattingEdits
							  )
							: provideDocumentRangeFormattingEdits(
									document2,
									range,
									options2,
									token
							  );
					},
				};
				return [
					vscode_1.languages.registerDocumentRangeFormattingEditProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		let DocumentOnTypeFormattingFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.DocumentOnTypeFormattingRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'onTypeFormatting'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.documentOnTypeFormattingProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideOnTypeFormattingEdits: (
						document2,
						position,
						ch,
						options2,
						token
					) => {
						const client = this._client;
						const provideOnTypeFormattingEdits = (
							document3,
							position2,
							ch2,
							options3,
							token2
						) => {
							let params = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
								position: client.code2ProtocolConverter.asPosition(position2),
								ch: ch2,
								options: client.code2ProtocolConverter.asFormattingOptions(
									options3,
									FileFormattingOptions.fromConfiguration(document3)
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1
										.DocumentOnTypeFormattingRequest.type,
									params,
									token2
								)
								.then(client.protocol2CodeConverter.asTextEdits, (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1
											.DocumentOnTypeFormattingRequest.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideOnTypeFormattingEdits
							? middleware.provideOnTypeFormattingEdits(
									document2,
									position,
									ch,
									options2,
									token,
									provideOnTypeFormattingEdits
							  )
							: provideOnTypeFormattingEdits(
									document2,
									position,
									ch,
									options2,
									token
							  );
					},
				};
				const moreTriggerCharacter = options.moreTriggerCharacter || [];
				return [
					vscode_1.languages.registerOnTypeFormattingEditProvider(
						options.documentSelector,
						provider,
						options.firstTriggerCharacter,
						...moreTriggerCharacter
					),
					provider,
				];
			}
		};
		let RenameFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.RenameRequest.type);
			}
			fillClientCapabilities(capabilities) {
				let rename = ensure(ensure(capabilities, 'textDocument'), 'rename');
				rename.dynamicRegistration = true;
				rename.prepareSupport = true;
				rename.prepareSupportDefaultBehavior =
					vscode_languageserver_protocol_1.PrepareSupportDefaultBehavior.Identifier;
				rename.honorsChangeAnnotations = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.renameProvider
				);
				if (!options) {
					return;
				}
				if (Is2.boolean(capabilities.renameProvider)) {
					options.prepareProvider = false;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideRenameEdits: (document2, position, newName, token) => {
						const client = this._client;
						const provideRenameEdits = (
							document3,
							position2,
							newName2,
							token2
						) => {
							let params = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
								position: client.code2ProtocolConverter.asPosition(position2),
								newName: newName2,
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.RenameRequest.type,
									params,
									token2
								)
								.then(
									client.protocol2CodeConverter.asWorkspaceEdit,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.RenameRequest.type,
											token2,
											error,
											null,
											false
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideRenameEdits
							? middleware.provideRenameEdits(
									document2,
									position,
									newName,
									token,
									provideRenameEdits
							  )
							: provideRenameEdits(document2, position, newName, token);
					},
					prepareRename: options.prepareProvider
						? (document2, position, token) => {
								const client = this._client;
								const prepareRename = (document3, position2, token2) => {
									let params = {
										textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
											document3
										),
										position: client.code2ProtocolConverter.asPosition(
											position2
										),
									};
									return client
										.sendRequest(
											vscode_languageserver_protocol_1.PrepareRenameRequest
												.type,
											params,
											token2
										)
										.then(
											(result) => {
												if (vscode_languageserver_protocol_1.Range.is(result)) {
													return client.protocol2CodeConverter.asRange(result);
												} else if (this.isDefaultBehavior(result)) {
													return result.defaultBehavior === true
														? null
														: Promise.reject(
																new Error(`The element can't be renamed.`)
														  );
												} else if (
													result &&
													vscode_languageserver_protocol_1.Range.is(
														result.range
													)
												) {
													return {
														range: client.protocol2CodeConverter.asRange(
															result.range
														),
														placeholder: result.placeholder,
													};
												}
												return Promise.reject(
													new Error(`The element can't be renamed.`)
												);
											},
											(error) => {
												if (typeof error.message === 'string') {
													throw new Error(error.message);
												} else {
													throw new Error(`The element can't be renamed.`);
												}
											}
										);
								};
								const middleware = client.clientOptions.middleware;
								return middleware.prepareRename
									? middleware.prepareRename(
											document2,
											position,
											token,
											prepareRename
									  )
									: prepareRename(document2, position, token);
						  }
						: void 0,
				};
				return [
					vscode_1.languages.registerRenameProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
			isDefaultBehavior(value) {
				const candidate = value;
				return candidate && Is2.boolean(candidate.defaultBehavior);
			}
		};
		let DocumentLinkFeature = class extends TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.DocumentLinkRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				const documentLinkCapabilities = ensure(
					ensure(capabilities, 'textDocument'),
					'documentLink'
				);
				documentLinkCapabilities.dynamicRegistration = true;
				documentLinkCapabilities.tooltipSupport = true;
			}
			initialize(capabilities, documentSelector) {
				const options = this.getRegistrationOptions(
					documentSelector,
					capabilities.documentLinkProvider
				);
				if (!options) {
					return;
				}
				this.register({ id: UUID.generateUuid(), registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideDocumentLinks: (document2, token) => {
						const client = this._client;
						const provideDocumentLinks = (document3, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.DocumentLinkRequest.type,
									client.code2ProtocolConverter.asDocumentLinkParams(document3),
									token2
								)
								.then(
									client.protocol2CodeConverter.asDocumentLinks,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.DocumentLinkRequest.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDocumentLinks
							? middleware.provideDocumentLinks(
									document2,
									token,
									provideDocumentLinks
							  )
							: provideDocumentLinks(document2, token);
					},
					resolveDocumentLink: options.resolveProvider
						? (link, token) => {
								const client = this._client;
								let resolveDocumentLink = (link2, token2) => {
									return client
										.sendRequest(
											vscode_languageserver_protocol_1
												.DocumentLinkResolveRequest.type,
											client.code2ProtocolConverter.asDocumentLink(link2),
											token2
										)
										.then(
											client.protocol2CodeConverter.asDocumentLink,
											(error) => {
												return client.handleFailedRequest(
													vscode_languageserver_protocol_1
														.DocumentLinkResolveRequest.type,
													token2,
													error,
													link2
												);
											}
										);
								};
								const middleware = client.clientOptions.middleware;
								return middleware.resolveDocumentLink
									? middleware.resolveDocumentLink(
											link,
											token,
											resolveDocumentLink
									  )
									: resolveDocumentLink(link, token);
						  }
						: void 0,
				};
				return [
					vscode_1.languages.registerDocumentLinkProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		let ConfigurationFeature = class {
			constructor(_client) {
				this._client = _client;
				this._listeners = new Map();
			}
			get registrationType() {
				return vscode_languageserver_protocol_1
					.DidChangeConfigurationNotification.type;
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'workspace'),
					'didChangeConfiguration'
				).dynamicRegistration = true;
			}
			initialize() {
				let section = this._client.clientOptions.synchronize
					.configurationSection;
				if (section !== void 0) {
					this.register({
						id: UUID.generateUuid(),
						registerOptions: {
							section,
						},
					});
				}
			}
			register(data) {
				let disposable = vscode_1.workspace.onDidChangeConfiguration(
					(event) => {
						this.onDidChangeConfiguration(data.registerOptions.section, event);
					}
				);
				this._listeners.set(data.id, disposable);
				if (data.registerOptions.section !== void 0) {
					this.onDidChangeConfiguration(data.registerOptions.section, void 0);
				}
			}
			unregister(id) {
				let disposable = this._listeners.get(id);
				if (disposable) {
					this._listeners.delete(id);
					disposable.dispose();
				}
			}
			dispose() {
				for (const disposable of this._listeners.values()) {
					disposable.dispose();
				}
				this._listeners.clear();
			}
			onDidChangeConfiguration(configurationSection, event) {
				let sections;
				if (Is2.string(configurationSection)) {
					sections = [configurationSection];
				} else {
					sections = configurationSection;
				}
				if (sections !== void 0 && event !== void 0) {
					let affected = sections.some((section) =>
						event.affectsConfiguration(section)
					);
					if (!affected) {
						return;
					}
				}
				const didChangeConfiguration = async (sections2) => {
					if (sections2 === void 0) {
						return this._client.sendNotification(
							vscode_languageserver_protocol_1
								.DidChangeConfigurationNotification.type,
							{ settings: null }
						);
					} else {
						return this._client.sendNotification(
							vscode_languageserver_protocol_1
								.DidChangeConfigurationNotification.type,
							{ settings: this.extractSettingsInformation(sections2) }
						);
					}
				};
				let middleware = this.getMiddleware();
				(middleware
					? middleware(sections, didChangeConfiguration)
					: didChangeConfiguration(sections)
				).catch((error) => {
					this._client.error(
						`Sending notification ${vscode_languageserver_protocol_1.DidChangeConfigurationNotification.type.method} failed`,
						error
					);
				});
			}
			extractSettingsInformation(keys) {
				function ensurePath(config, path) {
					let current = config;
					for (let i = 0; i < path.length - 1; i++) {
						let obj = current[path[i]];
						if (!obj) {
							obj = Object.create(null);
							current[path[i]] = obj;
						}
						current = obj;
					}
					return current;
				}
				let resource = this._client.clientOptions.workspaceFolder
					? this._client.clientOptions.workspaceFolder.uri
					: void 0;
				let result = Object.create(null);
				for (let i = 0; i < keys.length; i++) {
					let key = keys[i];
					let index = key.indexOf('.');
					let config = null;
					if (index >= 0) {
						config = vscode_1.workspace
							.getConfiguration(key.substr(0, index), resource)
							.get(key.substr(index + 1));
					} else {
						config = vscode_1.workspace
							.getConfiguration(void 0, resource)
							.get(key);
					}
					if (config) {
						let path = keys[i].split('.');
						ensurePath(result, path)[path[path.length - 1]] = (0,
						configuration_1.toJSONObject)(config);
					}
				}
				return result;
			}
			getMiddleware() {
				let middleware = this._client.clientOptions.middleware;
				if (
					middleware.workspace &&
					middleware.workspace.didChangeConfiguration
				) {
					return middleware.workspace.didChangeConfiguration;
				} else {
					return void 0;
				}
			}
		};
		let ExecuteCommandFeature = class {
			constructor(_client) {
				this._client = _client;
				this._commands = new Map();
			}
			get registrationType() {
				return vscode_languageserver_protocol_1.ExecuteCommandRequest.type;
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'workspace'),
					'executeCommand'
				).dynamicRegistration = true;
			}
			initialize(capabilities) {
				if (!capabilities.executeCommandProvider) {
					return;
				}
				this.register({
					id: UUID.generateUuid(),
					registerOptions: Object.assign(
						{},
						capabilities.executeCommandProvider
					),
				});
			}
			register(data) {
				const client = this._client;
				const middleware = client.clientOptions.middleware;
				const executeCommand = (command, args) => {
					let params = {
						command,
						arguments: args,
					};
					return client
						.sendRequest(
							vscode_languageserver_protocol_1.ExecuteCommandRequest.type,
							params
						)
						.then(void 0, (error) => {
							return client.handleFailedRequest(
								vscode_languageserver_protocol_1.ExecuteCommandRequest.type,
								void 0,
								error,
								void 0
							);
						});
				};
				if (data.registerOptions.commands) {
					const disposables = [];
					for (const command of data.registerOptions.commands) {
						disposables.push(
							vscode_1.commands.registerCommand(command, (...args) => {
								return middleware.executeCommand
									? middleware.executeCommand(command, args, executeCommand)
									: executeCommand(command, args);
							})
						);
					}
					this._commands.set(data.id, disposables);
				}
			}
			unregister(id) {
				let disposables = this._commands.get(id);
				if (disposables) {
					disposables.forEach((disposable) => disposable.dispose());
				}
			}
			dispose() {
				this._commands.forEach((value) => {
					value.forEach((disposable) => disposable.dispose());
				});
				this._commands.clear();
			}
		};
		let MessageTransports;
		(function (MessageTransports2) {
			function is2(value) {
				let candidate = value;
				return (
					candidate &&
					vscode_languageserver_protocol_1.MessageReader.is(value.reader) &&
					vscode_languageserver_protocol_1.MessageWriter.is(value.writer)
				);
			}
			MessageTransports2.is = is2;
		})(
			(MessageTransports =
				exports.MessageTransports || (exports.MessageTransports = {}))
		);
		let OnReady = class {
			constructor(_resolve, _reject) {
				this._resolve = _resolve;
				this._reject = _reject;
				this._used = false;
			}
			get isUsed() {
				return this._used;
			}
			resolve() {
				this._used = true;
				this._resolve();
			}
			reject(error) {
				this._used = true;
				this._reject(error);
			}
		};
		let LSPCancellationError = class extends vscode_1.CancellationError {
			constructor(data) {
				super();
				this.data = data;
			}
		};
		exports.LSPCancellationError = LSPCancellationError;
		var BaseLanguageClient = class {
			constructor(id, name, clientOptions) {
				this._traceFormat = vscode_languageserver_protocol_1.TraceFormat.Text;
				this._features = [];
				this._dynamicFeatures = new Map();
				this._id = id;
				this._name = name;
				clientOptions = clientOptions || {};
				const markdown = { isTrusted: false, supportHtml: false };
				if (clientOptions.markdown !== void 0) {
					markdown.isTrusted = clientOptions.markdown.isTrusted === true;
					markdown.supportHtml = clientOptions.markdown.supportHtml === true;
				}
				this._clientOptions = {
					documentSelector: clientOptions.documentSelector ?? [],
					synchronize: clientOptions.synchronize ?? {},
					diagnosticCollectionName: clientOptions.diagnosticCollectionName,
					outputChannelName: clientOptions.outputChannelName ?? this._name,
					revealOutputChannelOn:
						clientOptions.revealOutputChannelOn ?? RevealOutputChannelOn2.Error,
					stdioEncoding: clientOptions.stdioEncoding ?? 'utf8',
					initializationOptions: clientOptions.initializationOptions,
					initializationFailedHandler:
						clientOptions.initializationFailedHandler,
					progressOnInitialization: !!clientOptions.progressOnInitialization,
					errorHandler:
						clientOptions.errorHandler ??
						this.createDefaultErrorHandler(
							clientOptions.connectionOptions?.maxRestartCount
						),
					middleware: clientOptions.middleware ?? {},
					uriConverters: clientOptions.uriConverters,
					workspaceFolder: clientOptions.workspaceFolder,
					connectionOptions: clientOptions.connectionOptions,
					markdown,
					diagnosticPullOptions: clientOptions.diagnosticPullOptions ?? {
						onChange: true,
						onSave: false,
					},
				};
				this._clientOptions.synchronize = this._clientOptions.synchronize || {};
				this._state = ClientState.Initial;
				this._connectionPromise = void 0;
				this._resolvedConnection = void 0;
				this._initializeResult = void 0;
				if (clientOptions.outputChannel) {
					this._outputChannel = clientOptions.outputChannel;
					this._disposeOutputChannel = false;
				} else {
					this._outputChannel = void 0;
					this._disposeOutputChannel = true;
				}
				this._traceOutputChannel = clientOptions.traceOutputChannel;
				this._listeners = void 0;
				this._providers = void 0;
				this._diagnostics = void 0;
				this._fileEvents = [];
				this._fileEventDelayer = new async_1.Delayer(250);
				this._onReady = new Promise((resolve, reject) => {
					this._onReadyCallbacks = new OnReady(resolve, reject);
				});
				this._onStop = void 0;
				this._telemetryEmitter = new vscode_languageserver_protocol_1.Emitter();
				this._stateChangeEmitter = new vscode_languageserver_protocol_1.Emitter();
				this._trace = vscode_languageserver_protocol_1.Trace.Off;
				this._tracer = {
					log: (messageOrDataObject, data) => {
						if (Is2.string(messageOrDataObject)) {
							this.logTrace(messageOrDataObject, data);
						} else {
							this.logObjectTrace(messageOrDataObject);
						}
					},
				};
				this._c2p = c2p.createConverter(
					clientOptions.uriConverters
						? clientOptions.uriConverters.code2Protocol
						: void 0
				);
				this._p2c = p2c.createConverter(
					clientOptions.uriConverters
						? clientOptions.uriConverters.protocol2Code
						: void 0,
					this._clientOptions.markdown.isTrusted,
					this._clientOptions.markdown.supportHtml
				);
				this._syncedDocuments = new Map();
				this.registerBuiltinFeatures();
			}
			get state() {
				return this._state;
			}
			set state(value) {
				let oldState = this.getPublicState();
				this._state = value;
				let newState = this.getPublicState();
				if (newState !== oldState) {
					this._stateChangeEmitter.fire({ oldState, newState });
				}
			}
			getPublicState() {
				if (this.state === ClientState.Running) {
					return State.Running;
				} else if (this.state === ClientState.Starting) {
					return State.Starting;
				} else {
					return State.Stopped;
				}
			}
			get initializeResult() {
				return this._initializeResult;
			}
			sendRequest(type, ...params) {
				if (!this.isConnectionActive()) {
					throw new Error(
						`Language client is not ready yet when handling ${
							Is2.string(type) ? type : type.method
						}`
					);
				}
				this.forceDocumentSync();
				try {
					return this._resolvedConnection.sendRequest(type, ...params);
				} catch (error) {
					this.error(
						`Sending request ${Is2.string(type) ? type : type.method} failed.`,
						error
					);
					throw error;
				}
			}
			onRequest(type, handler) {
				if (!this.isConnectionActive()) {
					throw new Error(
						`Language client is not ready yet when handling ${
							Is2.string(type) ? type : type.method
						}`
					);
				}
				try {
					return this._resolvedConnection.onRequest(type, handler);
				} catch (error) {
					this.error(
						`Registering request handler ${
							Is2.string(type) ? type : type.method
						} failed.`,
						error
					);
					throw error;
				}
			}
			sendNotification(type, params) {
				if (!this.isConnectionActive()) {
					throw new Error(
						`Language client is not ready yet when handling ${
							Is2.string(type) ? type : type.method
						}`
					);
				}
				this.forceDocumentSync();
				try {
					return this._resolvedConnection.sendNotification(type, params);
				} catch (error) {
					this.error(
						`Sending notification ${
							Is2.string(type) ? type : type.method
						} failed.`,
						error
					);
					throw error;
				}
			}
			onNotification(type, handler) {
				if (!this.isConnectionActive()) {
					throw new Error(
						`Language client is not ready yet when handling ${
							Is2.string(type) ? type : type.method
						}`
					);
				}
				try {
					return this._resolvedConnection.onNotification(type, handler);
				} catch (error) {
					this.error(
						`Registering notification handler ${
							Is2.string(type) ? type : type.method
						} failed.`,
						error
					);
					throw error;
				}
			}
			onProgress(type, token, handler) {
				if (!this.isConnectionActive()) {
					throw new Error(
						'Language client is not ready yet when trying to send progress'
					);
				}
				try {
					if (vscode_languageserver_protocol_1.WorkDoneProgress.is(type)) {
						const handleWorkDoneProgress = this._clientOptions.middleware
							.handleWorkDoneProgress;
						if (handleWorkDoneProgress !== void 0) {
							return this._resolvedConnection.onProgress(
								type,
								token,
								(params) => {
									handleWorkDoneProgress(token, params, () => handler(params));
								}
							);
						}
					}
					return this._resolvedConnection.onProgress(type, token, handler);
				} catch (error) {
					this.error(
						`Registering progress handler for token ${token} failed.`,
						error
					);
					throw error;
				}
			}
			sendProgress(type, token, value) {
				if (!this.isConnectionActive()) {
					throw new Error(
						'Language client is not ready yet when trying to send progress'
					);
				}
				this.forceDocumentSync();
				return this._resolvedConnection
					.sendProgress(type, token, value)
					.then(void 0, (error) => {
						this.error(`Sending progress for token ${token} failed.`, error);
						throw error;
					});
			}
			get name() {
				return this._name;
			}
			get clientOptions() {
				return this._clientOptions;
			}
			get protocol2CodeConverter() {
				return this._p2c;
			}
			get code2ProtocolConverter() {
				return this._c2p;
			}
			get onTelemetry() {
				return this._telemetryEmitter.event;
			}
			get onDidChangeState() {
				return this._stateChangeEmitter.event;
			}
			get outputChannel() {
				if (!this._outputChannel) {
					this._outputChannel = vscode_1.window.createOutputChannel(
						this._clientOptions.outputChannelName
							? this._clientOptions.outputChannelName
							: this._name
					);
				}
				return this._outputChannel;
			}
			get traceOutputChannel() {
				if (this._traceOutputChannel) {
					return this._traceOutputChannel;
				}
				return this.outputChannel;
			}
			get diagnostics() {
				return this._diagnostics;
			}
			createDefaultErrorHandler(maxRestartCount) {
				if (maxRestartCount !== void 0 && maxRestartCount < 0) {
					throw new Error(`Invalid maxRestartCount: ${maxRestartCount}`);
				}
				return new DefaultErrorHandler(this, maxRestartCount ?? 4);
			}
			set trace(value) {
				this._trace = value;
				this.onReady().then(
					() => {
						this.resolveConnection().then(
							(connection) => {
								connection.trace(this._trace, this._tracer, {
									sendNotification: false,
									traceFormat: this._traceFormat,
								});
							},
							() => this.info(`Setting trace value failed`, void 0, false)
						);
					},
					() => {}
				);
			}
			data2String(data) {
				if (data instanceof vscode_languageserver_protocol_1.ResponseError) {
					const responseError = data;
					return `  Message: ${responseError.message}
  Code: ${responseError.code} ${
						responseError.data ? '\n' + responseError.data.toString() : ''
					}`;
				}
				if (data instanceof Error) {
					if (Is2.string(data.stack)) {
						return data.stack;
					}
					return data.message;
				}
				if (Is2.string(data)) {
					return data;
				}
				return data.toString();
			}
			info(message, data, showNotification = true) {
				this.outputChannel.appendLine(
					`[Info  - ${new Date().toLocaleTimeString()}] ${message}`
				);
				if (data !== null && data !== void 0) {
					this.outputChannel.appendLine(this.data2String(data));
				}
				if (
					showNotification &&
					this._clientOptions.revealOutputChannelOn <=
						RevealOutputChannelOn2.Info
				) {
					this.showNotificationMessage(
						vscode_languageserver_protocol_1.MessageType.Info,
						message
					);
				}
			}
			warn(message, data, showNotification = true) {
				this.outputChannel.appendLine(
					`[Warn  - ${new Date().toLocaleTimeString()}] ${message}`
				);
				if (data !== null && data !== void 0) {
					this.outputChannel.appendLine(this.data2String(data));
				}
				if (
					showNotification &&
					this._clientOptions.revealOutputChannelOn <=
						RevealOutputChannelOn2.Warn
				) {
					this.showNotificationMessage(
						vscode_languageserver_protocol_1.MessageType.Warning,
						message
					);
				}
			}
			error(message, data, showNotification = true) {
				this.outputChannel.appendLine(
					`[Error - ${new Date().toLocaleTimeString()}] ${message}`
				);
				if (data !== null && data !== void 0) {
					this.outputChannel.appendLine(this.data2String(data));
				}
				if (
					showNotification === 'force' ||
					(showNotification &&
						this._clientOptions.revealOutputChannelOn <=
							RevealOutputChannelOn2.Error)
				) {
					this.showNotificationMessage(
						vscode_languageserver_protocol_1.MessageType.Error,
						message
					);
				}
			}
			showNotificationMessage(type, message) {
				message =
					message ??
					'A request has failed. See the output for more information.';
				const messageFunc =
					type === vscode_languageserver_protocol_1.MessageType.Error
						? vscode_1.window.showErrorMessage
						: type === vscode_languageserver_protocol_1.MessageType.Warning
						? vscode_1.window.showWarningMessage
						: vscode_1.window.showInformationMessage;
				void messageFunc(message, 'Go to output').then((selection) => {
					if (selection !== void 0) {
						this.outputChannel.show(true);
					}
				});
			}
			logTrace(message, data) {
				this.traceOutputChannel.appendLine(
					`[Trace - ${new Date().toLocaleTimeString()}] ${message}`
				);
				if (data) {
					this.traceOutputChannel.appendLine(this.data2String(data));
				}
			}
			logObjectTrace(data) {
				if (data.isLSPMessage && data.type) {
					this.traceOutputChannel.append(
						`[LSP   - ${new Date().toLocaleTimeString()}] `
					);
				} else {
					this.traceOutputChannel.append(
						`[Trace - ${new Date().toLocaleTimeString()}] `
					);
				}
				if (data) {
					this.traceOutputChannel.appendLine(`${JSON.stringify(data)}`);
				}
			}
			needsStart() {
				return (
					this.state === ClientState.Initial ||
					this.state === ClientState.Stopping ||
					this.state === ClientState.Stopped
				);
			}
			needsStop() {
				return (
					this.state === ClientState.Starting ||
					this.state === ClientState.Running
				);
			}
			onReady() {
				return this._onReady;
			}
			isConnectionActive() {
				return this.state === ClientState.Running && !!this._resolvedConnection;
			}
			start() {
				if (this._onReadyCallbacks.isUsed) {
					this._onReady = new Promise((resolve, reject) => {
						this._onReadyCallbacks = new OnReady(resolve, reject);
					});
				}
				this._listeners = [];
				this._providers = [];
				if (!this._diagnostics) {
					this._diagnostics = this._clientOptions.diagnosticCollectionName
						? vscode_1.languages.createDiagnosticCollection(
								this._clientOptions.diagnosticCollectionName
						  )
						: vscode_1.languages.createDiagnosticCollection();
				}
				this.state = ClientState.Starting;
				this.resolveConnection()
					.then((connection) => {
						connection.onLogMessage((message) => {
							switch (message.type) {
								case vscode_languageserver_protocol_1.MessageType.Error:
									this.error(message.message, void 0, false);
									break;
								case vscode_languageserver_protocol_1.MessageType.Warning:
									this.warn(message.message, void 0, false);
									break;
								case vscode_languageserver_protocol_1.MessageType.Info:
									this.info(message.message, void 0, false);
									break;
								default:
									this.outputChannel.appendLine(message.message);
							}
						});
						connection.onShowMessage((message) => {
							switch (message.type) {
								case vscode_languageserver_protocol_1.MessageType.Error:
									void vscode_1.window.showErrorMessage(message.message);
									break;
								case vscode_languageserver_protocol_1.MessageType.Warning:
									void vscode_1.window.showWarningMessage(message.message);
									break;
								case vscode_languageserver_protocol_1.MessageType.Info:
									void vscode_1.window.showInformationMessage(message.message);
									break;
								default:
									void vscode_1.window.showInformationMessage(message.message);
							}
						});
						connection.onRequest(
							vscode_languageserver_protocol_1.ShowMessageRequest.type,
							(params) => {
								let messageFunc;
								switch (params.type) {
									case vscode_languageserver_protocol_1.MessageType.Error:
										messageFunc = vscode_1.window.showErrorMessage;
										break;
									case vscode_languageserver_protocol_1.MessageType.Warning:
										messageFunc = vscode_1.window.showWarningMessage;
										break;
									case vscode_languageserver_protocol_1.MessageType.Info:
										messageFunc = vscode_1.window.showInformationMessage;
										break;
									default:
										messageFunc = vscode_1.window.showInformationMessage;
								}
								let actions = params.actions || [];
								return messageFunc(params.message, ...actions);
							}
						);
						connection.onTelemetry((data) => {
							this._telemetryEmitter.fire(data);
						});
						connection.onRequest(
							vscode_languageserver_protocol_1.ShowDocumentRequest.type,
							async (params) => {
								const showDocument = async (params2) => {
									const uri = this.protocol2CodeConverter.asUri(params2.uri);
									try {
										if (params2.external === true) {
											const success = await vscode_1.env.openExternal(uri);
											return { success };
										} else {
											const options = {};
											if (params2.selection !== void 0) {
												options.selection = this.protocol2CodeConverter.asRange(
													params2.selection
												);
											}
											if (
												params2.takeFocus === void 0 ||
												params2.takeFocus === false
											) {
												options.preserveFocus = true;
											} else if (params2.takeFocus === true) {
												options.preserveFocus = false;
											}
											await vscode_1.window.showTextDocument(uri, options);
											return { success: true };
										}
									} catch (error) {
										return { success: true };
									}
								};
								const middleware = this._clientOptions.middleware.window
									?.showDocument;
								if (middleware !== void 0) {
									return middleware(params, showDocument);
								} else {
									return showDocument(params);
								}
							}
						);
						connection.listen();
						return this.initialize(connection);
					})
					.catch((error) => {
						this.state = ClientState.StartFailed;
						this._onReadyCallbacks.reject(error);
						this.error(
							`${this._name} client: couldn't create connection to server`,
							error,
							'force'
						);
					});
				return new vscode_1.Disposable(() => {
					if (this.needsStop()) {
						this.stop().catch((error) => {
							this.error(`Stopping server failed.`, error, false);
						});
					}
				});
			}
			resolveConnection() {
				if (!this._connectionPromise) {
					this._connectionPromise = this.createConnection();
				}
				return this._connectionPromise;
			}
			initialize(connection) {
				this.refreshTrace(connection, false);
				const initOption = this._clientOptions.initializationOptions;
				const [rootPath, workspaceFolders] =
					this._clientOptions.workspaceFolder !== void 0
						? [
								this._clientOptions.workspaceFolder.uri.fsPath,
								[
									{
										uri: this._c2p.asUri(
											this._clientOptions.workspaceFolder.uri
										),
										name: this._clientOptions.workspaceFolder.name,
									},
								],
						  ]
						: [this._clientGetRootPath(), null];
				const initParams = {
					processId: null,
					clientInfo: {
						name: vscode_1.env.appName,
						version: vscode_1.version,
					},
					locale: this.getLocale(),
					rootPath: rootPath ? rootPath : null,
					rootUri: rootPath
						? this._c2p.asUri(vscode_1.Uri.file(rootPath))
						: null,
					capabilities: this.computeClientCapabilities(),
					initializationOptions: Is2.func(initOption)
						? initOption()
						: initOption,
					trace: vscode_languageserver_protocol_1.Trace.toString(this._trace),
					workspaceFolders,
				};
				this.fillInitializeParams(initParams);
				if (this._clientOptions.progressOnInitialization) {
					const token = UUID.generateUuid();
					const part = new progressPart_1.ProgressPart(connection, token);
					initParams.workDoneToken = token;
					return this.doInitialize(connection, initParams).then(
						(result) => {
							part.done();
							return result;
						},
						(error) => {
							part.cancel();
							throw error;
						}
					);
				} else {
					return this.doInitialize(connection, initParams);
				}
			}
			doInitialize(connection, initParams) {
				return connection
					.initialize(initParams)
					.then((result) => {
						this._resolvedConnection = connection;
						this._initializeResult = result;
						this.state = ClientState.Running;
						let textDocumentSyncOptions = void 0;
						if (Is2.number(result.capabilities.textDocumentSync)) {
							if (
								result.capabilities.textDocumentSync ===
								vscode_languageserver_protocol_1.TextDocumentSyncKind.None
							) {
								textDocumentSyncOptions = {
									openClose: false,
									change:
										vscode_languageserver_protocol_1.TextDocumentSyncKind.None,
									save: void 0,
								};
							} else {
								textDocumentSyncOptions = {
									openClose: true,
									change: result.capabilities.textDocumentSync,
									save: {
										includeText: false,
									},
								};
							}
						} else if (
							result.capabilities.textDocumentSync !== void 0 &&
							result.capabilities.textDocumentSync !== null
						) {
							textDocumentSyncOptions = result.capabilities.textDocumentSync;
						}
						this._capabilities = Object.assign({}, result.capabilities, {
							resolvedTextDocumentSync: textDocumentSyncOptions,
						});
						connection.onDiagnostics((params) =>
							this.handleDiagnostics(params)
						);
						connection.onRequest(
							vscode_languageserver_protocol_1.RegistrationRequest.type,
							(params) => this.handleRegistrationRequest(params)
						);
						connection.onRequest('client/registerFeature', (params) =>
							this.handleRegistrationRequest(params)
						);
						connection.onRequest(
							vscode_languageserver_protocol_1.UnregistrationRequest.type,
							(params) => this.handleUnregistrationRequest(params)
						);
						connection.onRequest('client/unregisterFeature', (params) =>
							this.handleUnregistrationRequest(params)
						);
						connection.onRequest(
							vscode_languageserver_protocol_1.ApplyWorkspaceEditRequest.type,
							(params) => this.handleApplyWorkspaceEdit(params)
						);
						return connection
							.sendNotification(
								vscode_languageserver_protocol_1.InitializedNotification.type,
								{}
							)
							.then(() => {
								this.hookFileEvents(connection);
								this.hookConfigurationChanged(connection);
								this.initializeFeatures(connection);
								this._onReadyCallbacks.resolve();
								return result;
							});
					})
					.then(void 0, (error) => {
						if (this._clientOptions.initializationFailedHandler) {
							if (this._clientOptions.initializationFailedHandler(error)) {
								void this.initialize(connection);
							} else {
								void this.stop();
								this._onReadyCallbacks.reject(error);
							}
						} else if (
							error instanceof vscode_languageserver_protocol_1.ResponseError &&
							error.data &&
							error.data.retry
						) {
							void vscode_1.window
								.showErrorMessage(error.message, {
									title: 'Retry',
									id: 'retry',
								})
								.then((item) => {
									if (item && item.id === 'retry') {
										void this.initialize(connection);
									} else {
										void this.stop();
										this._onReadyCallbacks.reject(error);
									}
								});
						} else {
							if (error && error.message) {
								void vscode_1.window.showErrorMessage(error.message);
							}
							this.error('Server initialization failed.', error);
							void this.stop();
							this._onReadyCallbacks.reject(error);
						}
						throw error;
					});
			}
			_clientGetRootPath() {
				let folders = vscode_1.workspace.workspaceFolders;
				if (!folders || folders.length === 0) {
					return void 0;
				}
				let folder = folders[0];
				if (folder.uri.scheme === 'file') {
					return folder.uri.fsPath;
				}
				return void 0;
			}
			async stop(timeout = 2e3) {
				await this.onReady();
				this._initializeResult = void 0;
				if (!this._connectionPromise) {
					this.state = ClientState.Stopped;
					return Promise.resolve();
				}
				if (this.state === ClientState.Stopping && this._onStop) {
					return this._onStop;
				}
				this.state = ClientState.Stopping;
				this.cleanUp(false);
				const tp = new Promise((c) => {
					(0, vscode_languageserver_protocol_1.RAL)().timer.setTimeout(
						c,
						timeout
					);
				});
				const shutdown = this.resolveConnection().then((connection) => {
					return connection.shutdown().then(() => {
						return connection.exit().then(() => {
							return connection;
						});
					});
				});
				return (this._onStop = Promise.race([tp, shutdown])
					.then(
						(connection) => {
							if (connection !== void 0) {
								connection.end();
								connection.dispose();
							} else {
								this.error(`Stopping server timed out`, void 0, false);
								throw new Error(`Stopping the server timed out`);
							}
						},
						(error) => {
							this.error(`Stopping server failed`, error, false);
							throw error;
						}
					)
					.finally(() => {
						this.state = ClientState.Stopped;
						this.cleanUpChannel();
						this._onStop = void 0;
						this._connectionPromise = void 0;
						this._resolvedConnection = void 0;
					}));
			}
			cleanUp(channel = true, diagnostics = true) {
				if (this._listeners) {
					this._listeners.forEach((listener) => listener.dispose());
					this._listeners = void 0;
				}
				if (this._providers) {
					this._providers.forEach((provider) => provider.dispose());
					this._providers = void 0;
				}
				if (this._syncedDocuments) {
					this._syncedDocuments.clear();
				}
				for (const feature of this._features.values()) {
					feature.dispose();
				}
				if (channel) {
					this.cleanUpChannel();
				}
				if (diagnostics && this._diagnostics) {
					this._diagnostics.dispose();
					this._diagnostics = void 0;
				}
			}
			cleanUpChannel() {
				if (this._outputChannel && this._disposeOutputChannel) {
					this._outputChannel.dispose();
					this._outputChannel = void 0;
				}
			}
			notifyFileEvent(event) {
				const client = this;
				async function didChangeWatchedFile(event2) {
					client._fileEvents.push(event2);
					return client._fileEventDelayer.trigger(async () => {
						await client.onReady();
						const connection = await client.resolveConnection();
						let promise = Promise.resolve();
						if (client.isConnectionActive()) {
							client.forceDocumentSync();
							promise = connection.didChangeWatchedFiles({
								changes: client._fileEvents,
							});
						}
						client._fileEvents = [];
						return promise;
					});
				}
				const workSpaceMiddleware = this.clientOptions.middleware?.workspace;
				(workSpaceMiddleware?.didChangeWatchedFile
					? workSpaceMiddleware.didChangeWatchedFile(
							event,
							didChangeWatchedFile
					  )
					: didChangeWatchedFile(event)
				).catch((error) => {
					client.error(`Notify file events failed.`, error);
				});
			}
			forceDocumentSync() {
				if (this._didChangeTextDocumentFeature === void 0) {
					this._didChangeTextDocumentFeature = this._dynamicFeatures.get(
						vscode_languageserver_protocol_1.DidChangeTextDocumentNotification
							.type.method
					);
				}
				this._didChangeTextDocumentFeature.forceDelivery();
			}
			handleDiagnostics(params) {
				if (!this._diagnostics) {
					return;
				}
				let uri = this._p2c.asUri(params.uri);
				let diagnostics = this._p2c.asDiagnostics(params.diagnostics);
				let middleware = this.clientOptions.middleware;
				if (middleware.handleDiagnostics) {
					middleware.handleDiagnostics(uri, diagnostics, (uri2, diagnostics2) =>
						this.setDiagnostics(uri2, diagnostics2)
					);
				} else {
					this.setDiagnostics(uri, diagnostics);
				}
			}
			setDiagnostics(uri, diagnostics) {
				if (!this._diagnostics) {
					return;
				}
				this._diagnostics.set(uri, diagnostics);
			}
			createConnection() {
				let errorHandler = (error, message, count) => {
					this.handleConnectionError(error, message, count);
				};
				let closeHandler = () => {
					this.handleConnectionClosed();
				};
				return this.createMessageTransports(
					this._clientOptions.stdioEncoding || 'utf8'
				).then((transports) => {
					return createConnection(
						transports.reader,
						transports.writer,
						errorHandler,
						closeHandler,
						this._clientOptions.connectionOptions
					);
				});
			}
			handleConnectionClosed() {
				if (this.state === ClientState.Stopped) {
					return;
				}
				try {
					if (this._resolvedConnection) {
						this._resolvedConnection.dispose();
					}
				} catch (error) {}
				let handlerResult = { action: CloseAction.DoNotRestart };
				if (this.state !== ClientState.Stopping) {
					try {
						handlerResult = this._clientOptions.errorHandler.closed();
					} catch (error) {}
				}
				this._connectionPromise = void 0;
				this._resolvedConnection = void 0;
				if (handlerResult.action === CloseAction.DoNotRestart) {
					this.error(
						handlerResult.message ??
							'Connection to server got closed. Server will not be restarted.',
						void 0,
						'force'
					);
					if (this.state === ClientState.Starting) {
						this._onReadyCallbacks.reject(
							new Error(
								`Connection to server got closed. Server will not be restarted.`
							)
						);
						this.state = ClientState.StartFailed;
					} else {
						this.state = ClientState.Stopped;
					}
					this.cleanUp(false, true);
				} else if (handlerResult.action === CloseAction.Restart) {
					this.info(
						handlerResult.message ??
							'Connection to server got closed. Server will restart.'
					);
					this.cleanUp(false, false);
					this.state = ClientState.Initial;
					this.start();
				}
			}
			handleConnectionError(error, message, count) {
				const handlerResult = this._clientOptions.errorHandler.error(
					error,
					message,
					count
				);
				if (handlerResult.action === ErrorAction.Shutdown) {
					this.error(
						handlerResult.message ??
							`Client ${this._name}: connection to server is erroring. Shutting down server.`,
						void 0,
						'force'
					);
					this.stop().catch((error2) => {
						this.error(`Stopping server failed`, error2, false);
					});
				}
			}
			hookConfigurationChanged(connection) {
				vscode_1.workspace.onDidChangeConfiguration(() => {
					this.refreshTrace(connection, true);
				});
			}
			refreshTrace(connection, sendNotification = false) {
				const config = vscode_1.workspace.getConfiguration(this._id);
				let trace = vscode_languageserver_protocol_1.Trace.Off;
				let traceFormat = vscode_languageserver_protocol_1.TraceFormat.Text;
				if (config) {
					const traceConfig = config.get('trace.server', 'off');
					if (typeof traceConfig === 'string') {
						trace = vscode_languageserver_protocol_1.Trace.fromString(
							traceConfig
						);
					} else {
						trace = vscode_languageserver_protocol_1.Trace.fromString(
							config.get('trace.server.verbosity', 'off')
						);
						traceFormat = vscode_languageserver_protocol_1.TraceFormat.fromString(
							config.get('trace.server.format', 'text')
						);
					}
				}
				this._trace = trace;
				this._traceFormat = traceFormat;
				connection.trace(this._trace, this._tracer, {
					sendNotification,
					traceFormat: this._traceFormat,
				});
			}
			hookFileEvents(_connection) {
				let fileEvents = this._clientOptions.synchronize.fileEvents;
				if (!fileEvents) {
					return;
				}
				let watchers;
				if (Is2.array(fileEvents)) {
					watchers = fileEvents;
				} else {
					watchers = [fileEvents];
				}
				if (!watchers) {
					return;
				}
				this._dynamicFeatures
					.get(
						vscode_languageserver_protocol_1.DidChangeWatchedFilesNotification
							.type.method
					)
					.registerRaw(UUID.generateUuid(), watchers);
			}
			registerFeatures(features) {
				for (let feature of features) {
					this.registerFeature(feature);
				}
			}
			registerFeature(feature) {
				this._features.push(feature);
				if (DynamicFeature.is(feature)) {
					const registrationType = feature.registrationType;
					this._dynamicFeatures.set(registrationType.method, feature);
				}
			}
			getFeature(request) {
				return this._dynamicFeatures.get(request);
			}
			registerBuiltinFeatures() {
				this.registerFeature(new ConfigurationFeature(this));
				this.registerFeature(
					new DidOpenTextDocumentFeature(this, this._syncedDocuments)
				);
				this.registerFeature(new DidChangeTextDocumentFeature(this));
				this.registerFeature(new WillSaveFeature(this));
				this.registerFeature(new WillSaveWaitUntilFeature(this));
				this.registerFeature(new DidSaveTextDocumentFeature(this));
				this.registerFeature(
					new DidCloseTextDocumentFeature(this, this._syncedDocuments)
				);
				this.registerFeature(
					new FileSystemWatcherFeature(this, (event) =>
						this.notifyFileEvent(event)
					)
				);
				this.registerFeature(new CompletionItemFeature(this));
				this.registerFeature(new HoverFeature(this));
				this.registerFeature(new SignatureHelpFeature(this));
				this.registerFeature(new DefinitionFeature(this));
				this.registerFeature(new ReferencesFeature(this));
				this.registerFeature(new DocumentHighlightFeature(this));
				this.registerFeature(new DocumentSymbolFeature(this));
				this.registerFeature(new WorkspaceSymbolFeature(this));
				this.registerFeature(new CodeActionFeature(this));
				this.registerFeature(new CodeLensFeature(this));
				this.registerFeature(new DocumentFormattingFeature(this));
				this.registerFeature(new DocumentRangeFormattingFeature(this));
				this.registerFeature(new DocumentOnTypeFormattingFeature(this));
				this.registerFeature(new RenameFeature(this));
				this.registerFeature(new DocumentLinkFeature(this));
				this.registerFeature(new ExecuteCommandFeature(this));
			}
			fillInitializeParams(params) {
				for (let feature of this._features) {
					if (Is2.func(feature.fillInitializeParams)) {
						feature.fillInitializeParams(params);
					}
				}
			}
			computeClientCapabilities() {
				const result = {};
				ensure(result, 'workspace').applyEdit = true;
				const workspaceEdit = ensure(
					ensure(result, 'workspace'),
					'workspaceEdit'
				);
				workspaceEdit.documentChanges = true;
				workspaceEdit.resourceOperations = [
					vscode_languageserver_protocol_1.ResourceOperationKind.Create,
					vscode_languageserver_protocol_1.ResourceOperationKind.Rename,
					vscode_languageserver_protocol_1.ResourceOperationKind.Delete,
				];
				workspaceEdit.failureHandling =
					vscode_languageserver_protocol_1.FailureHandlingKind.TextOnlyTransactional;
				workspaceEdit.normalizesLineEndings = true;
				workspaceEdit.changeAnnotationSupport = {
					groupsOnLabel: true,
				};
				const diagnostics = ensure(
					ensure(result, 'textDocument'),
					'publishDiagnostics'
				);
				diagnostics.relatedInformation = true;
				diagnostics.versionSupport = false;
				diagnostics.tagSupport = {
					valueSet: [
						vscode_languageserver_protocol_1.DiagnosticTag.Unnecessary,
						vscode_languageserver_protocol_1.DiagnosticTag.Deprecated,
					],
				};
				diagnostics.codeDescriptionSupport = true;
				diagnostics.dataSupport = true;
				const windowCapabilities = ensure(result, 'window');
				const showMessage = ensure(windowCapabilities, 'showMessage');
				showMessage.messageActionItem = { additionalPropertiesSupport: true };
				const showDocument = ensure(windowCapabilities, 'showDocument');
				showDocument.support = true;
				const generalCapabilities = ensure(result, 'general');
				generalCapabilities.staleRequestSupport = {
					cancel: true,
					retryOnContentModified: Array.from(
						BaseLanguageClient.RequestsToCancelOnContentModified
					),
				};
				generalCapabilities.regularExpressions = {
					engine: 'ECMAScript',
					version: 'ES2020',
				};
				generalCapabilities.markdown = {
					parser: 'marked',
					version: '1.1.0',
				};
				if (this._clientOptions.markdown.supportHtml) {
					generalCapabilities.markdown.allowedTags = [
						'ul',
						'li',
						'p',
						'code',
						'blockquote',
						'ol',
						'h1',
						'h2',
						'h3',
						'h4',
						'h5',
						'h6',
						'hr',
						'em',
						'pre',
						'table',
						'thead',
						'tbody',
						'tr',
						'th',
						'td',
						'div',
						'del',
						'a',
						'strong',
						'br',
						'img',
						'span',
					];
				}
				for (let feature of this._features) {
					feature.fillClientCapabilities(result);
				}
				return result;
			}
			initializeFeatures(_connection) {
				let documentSelector = this._clientOptions.documentSelector;
				for (let feature of this._features) {
					feature.initialize(this._capabilities, documentSelector);
				}
			}
			handleRegistrationRequest(params) {
				return new Promise((resolve, reject) => {
					for (const registration of params.registrations) {
						const feature = this._dynamicFeatures.get(registration.method);
						if (feature === void 0) {
							reject(
								new Error(
									`No feature implementation for ${registration.method} found. Registration failed.`
								)
							);
							return;
						}
						const options = registration.registerOptions ?? {};
						options.documentSelector =
							options.documentSelector ?? this._clientOptions.documentSelector;
						const data = {
							id: registration.id,
							registerOptions: options,
						};
						try {
							feature.register(data);
						} catch (err) {
							reject(err);
							return;
						}
					}
					resolve();
				});
			}
			handleUnregistrationRequest(params) {
				return new Promise((resolve, reject) => {
					for (let unregistration of params.unregisterations) {
						const feature = this._dynamicFeatures.get(unregistration.method);
						if (!feature) {
							reject(
								new Error(
									`No feature implementation for ${unregistration.method} found. Unregistration failed.`
								)
							);
							return;
						}
						feature.unregister(unregistration.id);
					}
					resolve();
				});
			}
			handleApplyWorkspaceEdit(params) {
				let workspaceEdit = params.edit;
				let openTextDocuments = new Map();
				vscode_1.workspace.textDocuments.forEach((document2) =>
					openTextDocuments.set(document2.uri.toString(), document2)
				);
				let versionMismatch = false;
				if (workspaceEdit.documentChanges) {
					for (const change of workspaceEdit.documentChanges) {
						if (
							vscode_languageserver_protocol_1.TextDocumentEdit.is(change) &&
							change.textDocument.version &&
							change.textDocument.version >= 0
						) {
							let textDocument = openTextDocuments.get(change.textDocument.uri);
							if (
								textDocument &&
								textDocument.version !== change.textDocument.version
							) {
								versionMismatch = true;
								break;
							}
						}
					}
				}
				if (versionMismatch) {
					return Promise.resolve({ applied: false });
				}
				return Is2.asPromise(
					vscode_1.workspace
						.applyEdit(this._p2c.asWorkspaceEdit(params.edit))
						.then((value) => {
							return { applied: value };
						})
				);
			}
			handleFailedRequest(
				type,
				token,
				error,
				defaultValue,
				showNotification = true
			) {
				if (error instanceof vscode_languageserver_protocol_1.ResponseError) {
					if (
						error.code ===
							vscode_languageserver_protocol_1.LSPErrorCodes.RequestCancelled ||
						error.code ===
							vscode_languageserver_protocol_1.LSPErrorCodes.ServerCancelled
					) {
						if (token !== void 0 && token.isCancellationRequested) {
							return defaultValue;
						} else {
							if (error.data !== void 0) {
								throw new LSPCancellationError(error.data);
							} else {
								throw new vscode_1.CancellationError();
							}
						}
					} else if (
						error.code ===
						vscode_languageserver_protocol_1.LSPErrorCodes.ContentModified
					) {
						if (
							BaseLanguageClient.RequestsToCancelOnContentModified.has(
								type.method
							)
						) {
							throw new vscode_1.CancellationError();
						} else {
							return defaultValue;
						}
					}
				}
				this.error(`Request ${type.method} failed.`, error, showNotification);
				throw error;
			}
		};
		exports.BaseLanguageClient = BaseLanguageClient;
		BaseLanguageClient.RequestsToCancelOnContentModified = new Set([
			vscode_languageserver_protocol_1.SemanticTokensRequest.method,
			vscode_languageserver_protocol_1.SemanticTokensRangeRequest.method,
			vscode_languageserver_protocol_1.SemanticTokensDeltaRequest.method,
		]);
	},
});

// client/node_modules/vscode-languageclient/lib/common/colorProvider.js
let require_colorProvider = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/colorProvider.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ColorProviderFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let ColorProviderFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.DocumentColorRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'colorProvider'
				).dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				let [id, options] = this.getRegistration(
					documentSelector,
					capabilities.colorProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideColorPresentations: (color, context, token) => {
						const client = this._client;
						const provideColorPresentations = (color2, context2, token2) => {
							const requestParams = {
								color: color2,
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									context2.document
								),
								range: client.code2ProtocolConverter.asRange(context2.range),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.ColorPresentationRequest
										.type,
									requestParams,
									token2
								)
								.then(this.asColorPresentations.bind(this), (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1.ColorPresentationRequest
											.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideColorPresentations
							? middleware.provideColorPresentations(
									color,
									context,
									token,
									provideColorPresentations
							  )
							: provideColorPresentations(color, context, token);
					},
					provideDocumentColors: (document2, token) => {
						const client = this._client;
						const provideDocumentColors = (document3, token2) => {
							const requestParams = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.DocumentColorRequest.type,
									requestParams,
									token2
								)
								.then(this.asColorInformations.bind(this), (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1.ColorPresentationRequest
											.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDocumentColors
							? middleware.provideDocumentColors(
									document2,
									token,
									provideDocumentColors
							  )
							: provideDocumentColors(document2, token);
					},
				};
				return [
					vscode_1.languages.registerColorProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
			asColor(color) {
				return new vscode_1.Color(
					color.red,
					color.green,
					color.blue,
					color.alpha
				);
			}
			asColorInformations(colorInformation) {
				if (Array.isArray(colorInformation)) {
					return colorInformation.map((ci2) => {
						return new vscode_1.ColorInformation(
							this._client.protocol2CodeConverter.asRange(ci2.range),
							this.asColor(ci2.color)
						);
					});
				}
				return [];
			}
			asColorPresentations(colorPresentations) {
				if (Array.isArray(colorPresentations)) {
					return colorPresentations.map((cp) => {
						let presentation = new vscode_1.ColorPresentation(cp.label);
						presentation.additionalTextEdits = this._client.protocol2CodeConverter.asTextEdits(
							cp.additionalTextEdits
						);
						presentation.textEdit = this._client.protocol2CodeConverter.asTextEdit(
							cp.textEdit
						);
						return presentation;
					});
				}
				return [];
			}
		};
		exports.ColorProviderFeature = ColorProviderFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/implementation.js
let require_implementation = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/implementation.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ImplementationFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let ImplementationFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.ImplementationRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				let implementationSupport = ensure(
					ensure(capabilities, 'textDocument'),
					'implementation'
				);
				implementationSupport.dynamicRegistration = true;
				implementationSupport.linkSupport = true;
			}
			initialize(capabilities, documentSelector) {
				let [id, options] = this.getRegistration(
					documentSelector,
					capabilities.implementationProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideImplementation: (document2, position, token) => {
						const client = this._client;
						const provideImplementation = (document3, position2, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.ImplementationRequest.type,
									client.code2ProtocolConverter.asTextDocumentPositionParams(
										document3,
										position2
									),
									token2
								)
								.then(
									client.protocol2CodeConverter.asDefinitionResult,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.ImplementationRequest
												.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideImplementation
							? middleware.provideImplementation(
									document2,
									position,
									token,
									provideImplementation
							  )
							: provideImplementation(document2, position, token);
					},
				};
				return [
					vscode_1.languages.registerImplementationProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		exports.ImplementationFeature = ImplementationFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/typeDefinition.js
let require_typeDefinition = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/typeDefinition.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.TypeDefinitionFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let TypeDefinitionFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.TypeDefinitionRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'typeDefinition'
				).dynamicRegistration = true;
				let typeDefinitionSupport = ensure(
					ensure(capabilities, 'textDocument'),
					'typeDefinition'
				);
				typeDefinitionSupport.dynamicRegistration = true;
				typeDefinitionSupport.linkSupport = true;
			}
			initialize(capabilities, documentSelector) {
				let [id, options] = this.getRegistration(
					documentSelector,
					capabilities.typeDefinitionProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideTypeDefinition: (document2, position, token) => {
						const client = this._client;
						const provideTypeDefinition = (document3, position2, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.TypeDefinitionRequest.type,
									client.code2ProtocolConverter.asTextDocumentPositionParams(
										document3,
										position2
									),
									token2
								)
								.then(
									client.protocol2CodeConverter.asDefinitionResult,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.TypeDefinitionRequest
												.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideTypeDefinition
							? middleware.provideTypeDefinition(
									document2,
									position,
									token,
									provideTypeDefinition
							  )
							: provideTypeDefinition(document2, position, token);
					},
				};
				return [
					vscode_1.languages.registerTypeDefinitionProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		exports.TypeDefinitionFeature = TypeDefinitionFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/workspaceFolders.js
let require_workspaceFolders = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/workspaceFolders.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.WorkspaceFoldersFeature = exports.arrayDiff = void 0;
		let UUID = require_uuid();
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		function access(target, key) {
			if (target === void 0) {
				return void 0;
			}
			return target[key];
		}
		function arrayDiff(left, right) {
			return left.filter((element) => right.indexOf(element) < 0);
		}
		exports.arrayDiff = arrayDiff;
		let WorkspaceFoldersFeature = class {
			constructor(_client) {
				this._client = _client;
				this._listeners = new Map();
			}
			get registrationType() {
				return vscode_languageserver_protocol_1
					.DidChangeWorkspaceFoldersNotification.type;
			}
			fillInitializeParams(params) {
				const folders = vscode_1.workspace.workspaceFolders;
				this.initializeWithFolders(folders);
				if (folders === void 0) {
					params.workspaceFolders = null;
				} else {
					params.workspaceFolders = folders.map((folder) =>
						this.asProtocol(folder)
					);
				}
			}
			initializeWithFolders(currentWorkspaceFolders) {
				this._initialFolders = currentWorkspaceFolders;
			}
			fillClientCapabilities(capabilities) {
				capabilities.workspace = capabilities.workspace || {};
				capabilities.workspace.workspaceFolders = true;
			}
			initialize(capabilities) {
				const client = this._client;
				client.onRequest(
					vscode_languageserver_protocol_1.WorkspaceFoldersRequest.type,
					(token) => {
						const workspaceFolders = () => {
							const folders = vscode_1.workspace.workspaceFolders;
							if (folders === void 0) {
								return null;
							}
							const result = folders.map((folder) => {
								return this.asProtocol(folder);
							});
							return result;
						};
						const middleware = client.clientOptions.middleware.workspace;
						return middleware && middleware.workspaceFolders
							? middleware.workspaceFolders(token, workspaceFolders)
							: workspaceFolders(token);
					}
				);
				const value = access(
					access(access(capabilities, 'workspace'), 'workspaceFolders'),
					'changeNotifications'
				);
				let id;
				if (typeof value === 'string') {
					id = value;
				} else if (value === true) {
					id = UUID.generateUuid();
				}
				if (id) {
					this.register({ id, registerOptions: void 0 });
				}
			}
			sendInitialEvent(currentWorkspaceFolders) {
				let promise;
				if (this._initialFolders && currentWorkspaceFolders) {
					const removed = arrayDiff(
						this._initialFolders,
						currentWorkspaceFolders
					);
					const added = arrayDiff(
						currentWorkspaceFolders,
						this._initialFolders
					);
					if (added.length > 0 || removed.length > 0) {
						promise = this.doSendEvent(added, removed);
					}
				} else if (this._initialFolders) {
					promise = this.doSendEvent([], this._initialFolders);
				} else if (currentWorkspaceFolders) {
					promise = this.doSendEvent(currentWorkspaceFolders, []);
				}
				if (promise !== void 0) {
					promise.catch((error) => {
						this._client.error(
							`Sending notification ${vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type.method} failed`,
							error
						);
					});
				}
			}
			doSendEvent(addedFolders, removedFolders) {
				let params = {
					event: {
						added: addedFolders.map((folder) => this.asProtocol(folder)),
						removed: removedFolders.map((folder) => this.asProtocol(folder)),
					},
				};
				return this._client.sendNotification(
					vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification
						.type,
					params
				);
			}
			register(data) {
				let id = data.id;
				let client = this._client;
				let disposable = vscode_1.workspace.onDidChangeWorkspaceFolders(
					(event) => {
						let didChangeWorkspaceFolders = (event2) => {
							return this.doSendEvent(event2.added, event2.removed);
						};
						let middleware = client.clientOptions.middleware.workspace;
						const promise =
							middleware && middleware.didChangeWorkspaceFolders
								? middleware.didChangeWorkspaceFolders(
										event,
										didChangeWorkspaceFolders
								  )
								: didChangeWorkspaceFolders(event);
						promise.catch((error) => {
							this._client.error(
								`Sending notification ${vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type.method} failed`,
								error
							);
						});
					}
				);
				this._listeners.set(id, disposable);
				this.sendInitialEvent(vscode_1.workspace.workspaceFolders);
			}
			unregister(id) {
				let disposable = this._listeners.get(id);
				if (disposable === void 0) {
					return;
				}
				this._listeners.delete(id);
				disposable.dispose();
			}
			dispose() {
				for (let disposable of this._listeners.values()) {
					disposable.dispose();
				}
				this._listeners.clear();
			}
			asProtocol(workspaceFolder) {
				if (workspaceFolder === void 0) {
					return null;
				}
				return {
					uri: this._client.code2ProtocolConverter.asUri(workspaceFolder.uri),
					name: workspaceFolder.name,
				};
			}
		};
		exports.WorkspaceFoldersFeature = WorkspaceFoldersFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/foldingRange.js
let require_foldingRange = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/foldingRange.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.FoldingRangeFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		var FoldingRangeFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.FoldingRangeRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				let capability = ensure(
					ensure(capabilities, 'textDocument'),
					'foldingRange'
				);
				capability.dynamicRegistration = true;
				capability.rangeLimit = 5e3;
				capability.lineFoldingOnly = true;
			}
			initialize(capabilities, documentSelector) {
				let [id, options] = this.getRegistration(
					documentSelector,
					capabilities.foldingRangeProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideFoldingRanges: (document2, context, token) => {
						const client = this._client;
						const provideFoldingRanges = (document3, _2, token2) => {
							const requestParams = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.FoldingRangeRequest.type,
									requestParams,
									token2
								)
								.then(FoldingRangeFeature.asFoldingRanges, (error) => {
									return client.handleFailedRequest(
										vscode_languageserver_protocol_1.FoldingRangeRequest.type,
										token2,
										error,
										null
									);
								});
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideFoldingRanges
							? middleware.provideFoldingRanges(
									document2,
									context,
									token,
									provideFoldingRanges
							  )
							: provideFoldingRanges(document2, context, token);
					},
				};
				return [
					vscode_1.languages.registerFoldingRangeProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
			static asFoldingRangeKind(kind) {
				if (kind) {
					switch (kind) {
						case vscode_languageserver_protocol_1.FoldingRangeKind.Comment:
							return vscode_1.FoldingRangeKind.Comment;
						case vscode_languageserver_protocol_1.FoldingRangeKind.Imports:
							return vscode_1.FoldingRangeKind.Imports;
						case vscode_languageserver_protocol_1.FoldingRangeKind.Region:
							return vscode_1.FoldingRangeKind.Region;
					}
				}
				return void 0;
			}
			static asFoldingRanges(foldingRanges) {
				if (Array.isArray(foldingRanges)) {
					return foldingRanges.map((r) => {
						return new vscode_1.FoldingRange(
							r.startLine,
							r.endLine,
							FoldingRangeFeature.asFoldingRangeKind(r.kind)
						);
					});
				}
				return [];
			}
		};
		exports.FoldingRangeFeature = FoldingRangeFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/declaration.js
let require_declaration = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/declaration.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.DeclarationFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let DeclarationFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(client, vscode_languageserver_protocol_1.DeclarationRequest.type);
			}
			fillClientCapabilities(capabilities) {
				const declarationSupport = ensure(
					ensure(capabilities, 'textDocument'),
					'declaration'
				);
				declarationSupport.dynamicRegistration = true;
				declarationSupport.linkSupport = true;
			}
			initialize(capabilities, documentSelector) {
				const [id, options] = this.getRegistration(
					documentSelector,
					capabilities.declarationProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideDeclaration: (document2, position, token) => {
						const client = this._client;
						const provideDeclaration = (document3, position2, token2) => {
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.DeclarationRequest.type,
									client.code2ProtocolConverter.asTextDocumentPositionParams(
										document3,
										position2
									),
									token2
								)
								.then(
									client.protocol2CodeConverter.asDeclarationResult,
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.DeclarationRequest.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideDeclaration
							? middleware.provideDeclaration(
									document2,
									position,
									token,
									provideDeclaration
							  )
							: provideDeclaration(document2, position, token);
					},
				};
				return [
					vscode_1.languages.registerDeclarationProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		exports.DeclarationFeature = DeclarationFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/selectionRange.js
let require_selectionRange = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/selectionRange.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.SelectionRangeFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = Object.create(null);
			}
			return target[key];
		}
		let SelectionRangeFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.SelectionRangeRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				const capability = ensure(
					ensure(capabilities, 'textDocument'),
					'selectionRange'
				);
				capability.dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const [id, options] = this.getRegistration(
					documentSelector,
					capabilities.selectionRangeProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideSelectionRanges: (document2, positions, token) => {
						const client = this._client;
						const provideSelectionRanges = (document3, positions2, token2) => {
							const requestParams = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
								positions: client.code2ProtocolConverter.asPositions(
									positions2
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.SelectionRangeRequest.type,
									requestParams,
									token2
								)
								.then(
									(ranges) =>
										client.protocol2CodeConverter.asSelectionRanges(ranges),
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.SelectionRangeRequest
												.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideSelectionRanges
							? middleware.provideSelectionRanges(
									document2,
									positions,
									token,
									provideSelectionRanges
							  )
							: provideSelectionRanges(document2, positions, token);
					},
				};
				return [
					vscode_1.languages.registerSelectionRangeProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		exports.SelectionRangeFeature = SelectionRangeFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/progress.js
let require_progress = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/progress.js'(exports) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ProgressFeature = void 0;
		let vscode_languageserver_protocol_1 = require_main3();
		let progressPart_1 = require_progressPart();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = Object.create(null);
			}
			return target[key];
		}
		let ProgressFeature = class {
			constructor(_client) {
				this._client = _client;
				this.activeParts = new Set();
			}
			fillClientCapabilities(capabilities) {
				ensure(capabilities, 'window').workDoneProgress = true;
			}
			initialize() {
				const client = this._client;
				const deleteHandler = (part) => {
					this.activeParts.delete(part);
				};
				const createHandler = (params) => {
					this.activeParts.add(
						new progressPart_1.ProgressPart(
							this._client,
							params.token,
							deleteHandler
						)
					);
				};
				client.onRequest(
					vscode_languageserver_protocol_1.WorkDoneProgressCreateRequest.type,
					createHandler
				);
			}
			dispose() {
				for (const part of this.activeParts) {
					part.done();
				}
				this.activeParts.clear();
			}
		};
		exports.ProgressFeature = ProgressFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/callHierarchy.js
let require_callHierarchy = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/callHierarchy.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.CallHierarchyFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let CallHierarchyProvider = class {
			constructor(client) {
				this.client = client;
				this.middleware = client.clientOptions.middleware;
			}
			prepareCallHierarchy(document2, position, token) {
				const client = this.client;
				const middleware = this.middleware;
				const prepareCallHierarchy = (document3, position2, token2) => {
					const params = client.code2ProtocolConverter.asTextDocumentPositionParams(
						document3,
						position2
					);
					return client
						.sendRequest(
							vscode_languageserver_protocol_1.CallHierarchyPrepareRequest.type,
							params,
							token2
						)
						.then(
							(result) => {
								return client.protocol2CodeConverter.asCallHierarchyItems(
									result
								);
							},
							(error) => {
								return client.handleFailedRequest(
									vscode_languageserver_protocol_1.CallHierarchyPrepareRequest
										.type,
									token2,
									error,
									null
								);
							}
						);
				};
				return middleware.prepareCallHierarchy
					? middleware.prepareCallHierarchy(
							document2,
							position,
							token,
							prepareCallHierarchy
					  )
					: prepareCallHierarchy(document2, position, token);
			}
			provideCallHierarchyIncomingCalls(item, token) {
				const client = this.client;
				const middleware = this.middleware;
				const provideCallHierarchyIncomingCalls = (item2, token2) => {
					const params = {
						item: client.code2ProtocolConverter.asCallHierarchyItem(item2),
					};
					return client
						.sendRequest(
							vscode_languageserver_protocol_1.CallHierarchyIncomingCallsRequest
								.type,
							params,
							token2
						)
						.then(
							(result) => {
								return client.protocol2CodeConverter.asCallHierarchyIncomingCalls(
									result
								);
							},
							(error) => {
								return client.handleFailedRequest(
									vscode_languageserver_protocol_1
										.CallHierarchyIncomingCallsRequest.type,
									token2,
									error,
									null
								);
							}
						);
				};
				return middleware.provideCallHierarchyIncomingCalls
					? middleware.provideCallHierarchyIncomingCalls(
							item,
							token,
							provideCallHierarchyIncomingCalls
					  )
					: provideCallHierarchyIncomingCalls(item, token);
			}
			provideCallHierarchyOutgoingCalls(item, token) {
				const client = this.client;
				const middleware = this.middleware;
				const provideCallHierarchyOutgoingCalls = (item2, token2) => {
					const params = {
						item: client.code2ProtocolConverter.asCallHierarchyItem(item2),
					};
					return client
						.sendRequest(
							vscode_languageserver_protocol_1.CallHierarchyOutgoingCallsRequest
								.type,
							params,
							token2
						)
						.then(
							(result) => {
								return client.protocol2CodeConverter.asCallHierarchyOutgoingCalls(
									result
								);
							},
							(error) => {
								return client.handleFailedRequest(
									vscode_languageserver_protocol_1
										.CallHierarchyOutgoingCallsRequest.type,
									token2,
									error,
									null
								);
							}
						);
				};
				return middleware.provideCallHierarchyOutgoingCalls
					? middleware.provideCallHierarchyOutgoingCalls(
							item,
							token,
							provideCallHierarchyOutgoingCalls
					  )
					: provideCallHierarchyOutgoingCalls(item, token);
			}
		};
		let CallHierarchyFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.CallHierarchyPrepareRequest.type
				);
			}
			fillClientCapabilities(cap) {
				const capabilities = cap;
				const capability = ensure(
					ensure(capabilities, 'textDocument'),
					'callHierarchy'
				);
				capability.dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const [id, options] = this.getRegistration(
					documentSelector,
					capabilities.callHierarchyProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const client = this._client;
				const provider = new CallHierarchyProvider(client);
				return [
					vscode_1.languages.registerCallHierarchyProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		exports.CallHierarchyFeature = CallHierarchyFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/semanticTokens.js
let require_semanticTokens = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/semanticTokens.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.SemanticTokensFeature = void 0;
		let vscode3 = require('vscode');
		let client_1 = require_client();
		let vscode_languageserver_protocol_1 = require_main3();
		let Is2 = require_is3();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let SemanticTokensFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.SemanticTokensRegistrationType.type
				);
			}
			fillClientCapabilities(capabilities) {
				const capability = ensure(
					ensure(capabilities, 'textDocument'),
					'semanticTokens'
				);
				capability.dynamicRegistration = true;
				capability.tokenTypes = [
					vscode_languageserver_protocol_1.SemanticTokenTypes.namespace,
					vscode_languageserver_protocol_1.SemanticTokenTypes.type,
					vscode_languageserver_protocol_1.SemanticTokenTypes.class,
					vscode_languageserver_protocol_1.SemanticTokenTypes.enum,
					vscode_languageserver_protocol_1.SemanticTokenTypes.interface,
					vscode_languageserver_protocol_1.SemanticTokenTypes.struct,
					vscode_languageserver_protocol_1.SemanticTokenTypes.typeParameter,
					vscode_languageserver_protocol_1.SemanticTokenTypes.parameter,
					vscode_languageserver_protocol_1.SemanticTokenTypes.variable,
					vscode_languageserver_protocol_1.SemanticTokenTypes.property,
					vscode_languageserver_protocol_1.SemanticTokenTypes.enumMember,
					vscode_languageserver_protocol_1.SemanticTokenTypes.event,
					vscode_languageserver_protocol_1.SemanticTokenTypes.function,
					vscode_languageserver_protocol_1.SemanticTokenTypes.method,
					vscode_languageserver_protocol_1.SemanticTokenTypes.macro,
					vscode_languageserver_protocol_1.SemanticTokenTypes.keyword,
					vscode_languageserver_protocol_1.SemanticTokenTypes.modifier,
					vscode_languageserver_protocol_1.SemanticTokenTypes.comment,
					vscode_languageserver_protocol_1.SemanticTokenTypes.string,
					vscode_languageserver_protocol_1.SemanticTokenTypes.number,
					vscode_languageserver_protocol_1.SemanticTokenTypes.regexp,
					vscode_languageserver_protocol_1.SemanticTokenTypes.operator,
					vscode_languageserver_protocol_1.SemanticTokenTypes.decorator,
				];
				capability.tokenModifiers = [
					vscode_languageserver_protocol_1.SemanticTokenModifiers.declaration,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.definition,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.readonly,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.static,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.deprecated,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.abstract,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.async,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.modification,
					vscode_languageserver_protocol_1.SemanticTokenModifiers.documentation,
					vscode_languageserver_protocol_1.SemanticTokenModifiers
						.defaultLibrary,
				];
				capability.formats = [
					vscode_languageserver_protocol_1.TokenFormat.Relative,
				];
				capability.requests = {
					range: true,
					full: {
						delta: true,
					},
				};
				capability.multilineTokenSupport = false;
				capability.overlappingTokenSupport = false;
				capability.serverCancelSupport = true;
				capability.augmentsSyntaxTokens = true;
				ensure(
					ensure(capabilities, 'workspace'),
					'semanticTokens'
				).refreshSupport = true;
			}
			initialize(capabilities, documentSelector) {
				const client = this._client;
				client.onRequest(
					vscode_languageserver_protocol_1.SemanticTokensRefreshRequest.type,
					async () => {
						for (const provider of this.getAllProviders()) {
							provider.onDidChangeSemanticTokensEmitter.fire();
						}
					}
				);
				const [id, options] = this.getRegistration(
					documentSelector,
					capabilities.semanticTokensProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const fullProvider = Is2.boolean(options.full)
					? options.full
					: options.full !== void 0;
				const hasEditProvider =
					options.full !== void 0 &&
					typeof options.full !== 'boolean' &&
					options.full.delta === true;
				const eventEmitter = new vscode3.EventEmitter();
				const documentProvider = fullProvider
					? {
							onDidChangeSemanticTokens: eventEmitter.event,
							provideDocumentSemanticTokens: (document2, token) => {
								const client2 = this._client;
								const middleware = client2.clientOptions.middleware;
								const provideDocumentSemanticTokens = (document3, token2) => {
									const params = {
										textDocument: client2.code2ProtocolConverter.asTextDocumentIdentifier(
											document3
										),
									};
									return client2
										.sendRequest(
											vscode_languageserver_protocol_1.SemanticTokensRequest
												.type,
											params,
											token2
										)
										.then(
											(result) => {
												return client2.protocol2CodeConverter.asSemanticTokens(
													result
												);
											},
											(error) => {
												return client2.handleFailedRequest(
													vscode_languageserver_protocol_1.SemanticTokensRequest
														.type,
													token2,
													error,
													null
												);
											}
										);
								};
								return middleware.provideDocumentSemanticTokens
									? middleware.provideDocumentSemanticTokens(
											document2,
											token,
											provideDocumentSemanticTokens
									  )
									: provideDocumentSemanticTokens(document2, token);
							},
							provideDocumentSemanticTokensEdits: hasEditProvider
								? (document2, previousResultId, token) => {
										const client2 = this._client;
										const middleware = client2.clientOptions.middleware;
										const provideDocumentSemanticTokensEdits = (
											document3,
											previousResultId2,
											token2
										) => {
											const params = {
												textDocument: client2.code2ProtocolConverter.asTextDocumentIdentifier(
													document3
												),
												previousResultId: previousResultId2,
											};
											return client2
												.sendRequest(
													vscode_languageserver_protocol_1
														.SemanticTokensDeltaRequest.type,
													params,
													token2
												)
												.then(
													(result) => {
														if (
															vscode_languageserver_protocol_1.SemanticTokens.is(
																result
															)
														) {
															return client2.protocol2CodeConverter.asSemanticTokens(
																result
															);
														} else {
															return client2.protocol2CodeConverter.asSemanticTokensEdits(
																result
															);
														}
													},
													(error) => {
														return client2.handleFailedRequest(
															vscode_languageserver_protocol_1
																.SemanticTokensDeltaRequest.type,
															token2,
															error,
															null
														);
													}
												);
										};
										return middleware.provideDocumentSemanticTokensEdits
											? middleware.provideDocumentSemanticTokensEdits(
													document2,
													previousResultId,
													token,
													provideDocumentSemanticTokensEdits
											  )
											: provideDocumentSemanticTokensEdits(
													document2,
													previousResultId,
													token
											  );
								  }
								: void 0,
					  }
					: void 0;
				const hasRangeProvider = options.range === true;
				const rangeProvider = hasRangeProvider
					? {
							provideDocumentRangeSemanticTokens: (document2, range, token) => {
								const client2 = this._client;
								const middleware = client2.clientOptions.middleware;
								const provideDocumentRangeSemanticTokens = (
									document3,
									range2,
									token2
								) => {
									const params = {
										textDocument: client2.code2ProtocolConverter.asTextDocumentIdentifier(
											document3
										),
										range: client2.code2ProtocolConverter.asRange(range2),
									};
									return client2
										.sendRequest(
											vscode_languageserver_protocol_1
												.SemanticTokensRangeRequest.type,
											params,
											token2
										)
										.then(
											(result) => {
												return client2.protocol2CodeConverter.asSemanticTokens(
													result
												);
											},
											(error) => {
												return client2.handleFailedRequest(
													vscode_languageserver_protocol_1
														.SemanticTokensRangeRequest.type,
													token2,
													error,
													null
												);
											}
										);
								};
								return middleware.provideDocumentRangeSemanticTokens
									? middleware.provideDocumentRangeSemanticTokens(
											document2,
											range,
											token,
											provideDocumentRangeSemanticTokens
									  )
									: provideDocumentRangeSemanticTokens(document2, range, token);
							},
					  }
					: void 0;
				const disposables = [];
				const client = this._client;
				const legend = client.protocol2CodeConverter.asSemanticTokensLegend(
					options.legend
				);
				if (documentProvider !== void 0) {
					disposables.push(
						vscode3.languages.registerDocumentSemanticTokensProvider(
							options.documentSelector,
							documentProvider,
							legend
						)
					);
				}
				if (rangeProvider !== void 0) {
					disposables.push(
						vscode3.languages.registerDocumentRangeSemanticTokensProvider(
							options.documentSelector,
							rangeProvider,
							legend
						)
					);
				}
				return [
					new vscode3.Disposable(() =>
						disposables.forEach((item) => item.dispose())
					),
					{
						range: rangeProvider,
						full: documentProvider,
						onDidChangeSemanticTokensEmitter: eventEmitter,
					},
				];
			}
		};
		exports.SemanticTokensFeature = SemanticTokensFeature;
	},
});

// client/node_modules/concat-map/index.js
let require_concat_map = __commonJS({
	'client/node_modules/concat-map/index.js'(exports, module2) {
		module2.exports = function (xs2, fn2) {
			let res = [];
			for (let i = 0; i < xs2.length; i++) {
				let x2 = fn2(xs2[i], i);
				if (isArray(x2)) {
					res.push.apply(res, x2);
				} else {
					res.push(x2);
				}
			}
			return res;
		};
		var isArray =
			Array.isArray ||
			function (xs2) {
				return Object.prototype.toString.call(xs2) === '[object Array]';
			};
	},
});

// client/node_modules/balanced-match/index.js
let require_balanced_match = __commonJS({
	'client/node_modules/balanced-match/index.js'(exports, module2) {
		'use strict';
		module2.exports = balanced;
		function balanced(a, b, str) {
			if (a instanceof RegExp) {
				a = maybeMatch(a, str);
			}
			if (b instanceof RegExp) {
				b = maybeMatch(b, str);
			}
			let r = range(a, b, str);
			return (
				r && {
					start: r[0],
					end: r[1],
					pre: str.slice(0, r[0]),
					body: str.slice(r[0] + a.length, r[1]),
					post: str.slice(r[1] + b.length),
				}
			);
		}
		function maybeMatch(reg, str) {
			let m = str.match(reg);
			return m ? m[0] : null;
		}
		balanced.range = range;
		function range(a, b, str) {
			let begs, beg, left, right, result;
			let ai2 = str.indexOf(a);
			let bi2 = str.indexOf(b, ai2 + 1);
			let i = ai2;
			if (ai2 >= 0 && bi2 > 0) {
				if (a === b) {
					return [ai2, bi2];
				}
				begs = [];
				left = str.length;
				while (i >= 0 && !result) {
					if (i == ai2) {
						begs.push(i);
						ai2 = str.indexOf(a, i + 1);
					} else if (begs.length == 1) {
						result = [begs.pop(), bi2];
					} else {
						beg = begs.pop();
						if (beg < left) {
							left = beg;
							right = bi2;
						}
						bi2 = str.indexOf(b, i + 1);
					}
					i = ai2 < bi2 && ai2 >= 0 ? ai2 : bi2;
				}
				if (begs.length) {
					result = [left, right];
				}
			}
			return result;
		}
	},
});

// client/node_modules/brace-expansion/index.js
let require_brace_expansion = __commonJS({
	'client/node_modules/brace-expansion/index.js'(exports, module2) {
		let concatMap = require_concat_map();
		let balanced = require_balanced_match();
		module2.exports = expandTop;
		let escSlash = '\0SLASH' + Math.random() + '\0';
		let escOpen = '\0OPEN' + Math.random() + '\0';
		let escClose = '\0CLOSE' + Math.random() + '\0';
		let escComma = '\0COMMA' + Math.random() + '\0';
		let escPeriod = '\0PERIOD' + Math.random() + '\0';
		function numeric(str) {
			return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
		}
		function escapeBraces(str) {
			return str
				.split('\\\\')
				.join(escSlash)
				.split('\\{')
				.join(escOpen)
				.split('\\}')
				.join(escClose)
				.split('\\,')
				.join(escComma)
				.split('\\.')
				.join(escPeriod);
		}
		function unescapeBraces(str) {
			return str
				.split(escSlash)
				.join('\\')
				.split(escOpen)
				.join('{')
				.split(escClose)
				.join('}')
				.split(escComma)
				.join(',')
				.split(escPeriod)
				.join('.');
		}
		function parseCommaParts(str) {
			if (!str) {
				return [''];
			}
			let parts = [];
			let m = balanced('{', '}', str);
			if (!m) {
				return str.split(',');
			}
			let pre = m.pre;
			let body = m.body;
			let post = m.post;
			let p = pre.split(',');
			p[p.length - 1] += '{' + body + '}';
			let postParts = parseCommaParts(post);
			if (post.length) {
				p[p.length - 1] += postParts.shift();
				p.push.apply(p, postParts);
			}
			parts.push.apply(parts, p);
			return parts;
		}
		function expandTop(str) {
			if (!str) {
				return [];
			}
			if (str.substr(0, 2) === '{}') {
				str = '\\{\\}' + str.substr(2);
			}
			return expand(escapeBraces(str), true).map(unescapeBraces);
		}
		function embrace(str) {
			return '{' + str + '}';
		}
		function isPadded(el2) {
			return /^-?0\d/.test(el2);
		}
		function lte(i, y) {
			return i <= y;
		}
		function gte(i, y) {
			return i >= y;
		}
		function expand(str, isTop) {
			let expansions = [];
			let m = balanced('{', '}', str);
			if (!m || /\$$/.test(m.pre)) {
				return [str];
			}
			let isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
			let isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
			let isSequence = isNumericSequence || isAlphaSequence;
			let isOptions = m.body.indexOf(',') >= 0;
			if (!isSequence && !isOptions) {
				if (m.post.match(/,.*\}/)) {
					str = m.pre + '{' + m.body + escClose + m.post;
					return expand(str);
				}
				return [str];
			}
			let n;
			if (isSequence) {
				n = m.body.split(/\.\./);
			} else {
				n = parseCommaParts(m.body);
				if (n.length === 1) {
					n = expand(n[0], false).map(embrace);
					if (n.length === 1) {
						var post = m.post.length ? expand(m.post, false) : [''];
						return post.map(function (p) {
							return m.pre + n[0] + p;
						});
					}
				}
			}
			let pre = m.pre;
			var post = m.post.length ? expand(m.post, false) : [''];
			let N;
			if (isSequence) {
				let x2 = numeric(n[0]);
				let y = numeric(n[1]);
				let width = Math.max(n[0].length, n[1].length);
				let incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
				let test = lte;
				let reverse = y < x2;
				if (reverse) {
					incr *= -1;
					test = gte;
				}
				let pad = n.some(isPadded);
				N = [];
				for (let i = x2; test(i, y); i += incr) {
					var c;
					if (isAlphaSequence) {
						c = String.fromCharCode(i);
						if (c === '\\') {
							c = '';
						}
					} else {
						c = String(i);
						if (pad) {
							let need = width - c.length;
							if (need > 0) {
								let z = new Array(need + 1).join('0');
								if (i < 0) {
									c = '-' + z + c.slice(1);
								} else {
									c = z + c;
								}
							}
						}
					}
					N.push(c);
				}
			} else {
				N = concatMap(n, function (el2) {
					return expand(el2, false);
				});
			}
			for (let j2 = 0; j2 < N.length; j2++) {
				for (let k = 0; k < post.length; k++) {
					let expansion = pre + N[j2] + post[k];
					if (!isTop || isSequence || expansion) {
						expansions.push(expansion);
					}
				}
			}
			return expansions;
		}
	},
});

// client/node_modules/minimatch/minimatch.js
let require_minimatch = __commonJS({
	'client/node_modules/minimatch/minimatch.js'(exports, module2) {
		module2.exports = minimatch;
		minimatch.Minimatch = Minimatch;
		let path = { sep: '/' };
		try {
			path = require('path');
		} catch (er2) {}
		let GLOBSTAR = (minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {});
		let expand = require_brace_expansion();
		let plTypes = {
			'!': { open: '(?:(?!(?:', close: '))[^/]*?)' },
			'?': { open: '(?:', close: ')?' },
			'+': { open: '(?:', close: ')+' },
			'*': { open: '(?:', close: ')*' },
			'@': { open: '(?:', close: ')' },
		};
		let qmark = '[^/]';
		let star = qmark + '*?';
		let twoStarDot = '(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?';
		let twoStarNoDot = '(?:(?!(?:\\/|^)\\.).)*?';
		let reSpecials = charSet('().*{}+?[]^$\\!');
		function charSet(s) {
			return s.split('').reduce(function (set, c) {
				set[c] = true;
				return set;
			}, {});
		}
		let slashSplit = /\/+/;
		minimatch.filter = filter;
		function filter(pattern, options) {
			options = options || {};
			return function (p, i, list) {
				return minimatch(p, pattern, options);
			};
		}
		function ext(a, b) {
			a = a || {};
			b = b || {};
			let t = {};
			Object.keys(b).forEach(function (k) {
				t[k] = b[k];
			});
			Object.keys(a).forEach(function (k) {
				t[k] = a[k];
			});
			return t;
		}
		minimatch.defaults = function (def) {
			if (!def || !Object.keys(def).length) {
				return minimatch;
			}
			let orig = minimatch;
			let m = function minimatch2(p, pattern, options) {
				return orig.minimatch(p, pattern, ext(def, options));
			};
			m.Minimatch = function Minimatch2(pattern, options) {
				return new orig.Minimatch(pattern, ext(def, options));
			};
			return m;
		};
		Minimatch.defaults = function (def) {
			if (!def || !Object.keys(def).length) {
				return Minimatch;
			}
			return minimatch.defaults(def).Minimatch;
		};
		function minimatch(p, pattern, options) {
			if (typeof pattern !== 'string') {
				throw new TypeError('glob pattern string required');
			}
			if (!options) {
				options = {};
			}
			if (!options.nocomment && pattern.charAt(0) === '#') {
				return false;
			}
			if (pattern.trim() === '') {
				return p === '';
			}
			return new Minimatch(pattern, options).match(p);
		}
		function Minimatch(pattern, options) {
			if (!(this instanceof Minimatch)) {
				return new Minimatch(pattern, options);
			}
			if (typeof pattern !== 'string') {
				throw new TypeError('glob pattern string required');
			}
			if (!options) {
				options = {};
			}
			pattern = pattern.trim();
			if (path.sep !== '/') {
				pattern = pattern.split(path.sep).join('/');
			}
			this.options = options;
			this.set = [];
			this.pattern = pattern;
			this.regexp = null;
			this.negate = false;
			this.comment = false;
			this.empty = false;
			this.make();
		}
		Minimatch.prototype.debug = function () {};
		Minimatch.prototype.make = make;
		function make() {
			if (this._made) {
				return;
			}
			let pattern = this.pattern;
			let options = this.options;
			if (!options.nocomment && pattern.charAt(0) === '#') {
				this.comment = true;
				return;
			}
			if (!pattern) {
				this.empty = true;
				return;
			}
			this.parseNegate();
			let set = (this.globSet = this.braceExpand());
			if (options.debug) {
				this.debug = console.error;
			}
			this.debug(this.pattern, set);
			set = this.globParts = set.map(function (s) {
				return s.split(slashSplit);
			});
			this.debug(this.pattern, set);
			set = set.map(function (s, si2, set2) {
				return s.map(this.parse, this);
			}, this);
			this.debug(this.pattern, set);
			set = set.filter(function (s) {
				return s.indexOf(false) === -1;
			});
			this.debug(this.pattern, set);
			this.set = set;
		}
		Minimatch.prototype.parseNegate = parseNegate;
		function parseNegate() {
			let pattern = this.pattern;
			let negate = false;
			let options = this.options;
			let negateOffset = 0;
			if (options.nonegate) {
				return;
			}
			for (
				let i = 0, l = pattern.length;
				i < l && pattern.charAt(i) === '!';
				i++
			) {
				negate = !negate;
				negateOffset++;
			}
			if (negateOffset) {
				this.pattern = pattern.substr(negateOffset);
			}
			this.negate = negate;
		}
		minimatch.braceExpand = function (pattern, options) {
			return braceExpand(pattern, options);
		};
		Minimatch.prototype.braceExpand = braceExpand;
		function braceExpand(pattern, options) {
			if (!options) {
				if (this instanceof Minimatch) {
					options = this.options;
				} else {
					options = {};
				}
			}
			pattern = typeof pattern === 'undefined' ? this.pattern : pattern;
			if (typeof pattern === 'undefined') {
				throw new TypeError('undefined pattern');
			}
			if (options.nobrace || !pattern.match(/\{.*\}/)) {
				return [pattern];
			}
			return expand(pattern);
		}
		Minimatch.prototype.parse = parse;
		let SUBPARSE = {};
		function parse(pattern, isSub) {
			if (pattern.length > 1024 * 64) {
				throw new TypeError('pattern is too long');
			}
			let options = this.options;
			if (!options.noglobstar && pattern === '**') {
				return GLOBSTAR;
			}
			if (pattern === '') {
				return '';
			}
			let re2 = '';
			let hasMagic = !!options.nocase;
			let escaping = false;
			let patternListStack = [];
			let negativeLists = [];
			let stateChar;
			let inClass = false;
			let reClassStart = -1;
			let classStart = -1;
			let patternStart =
				pattern.charAt(0) === '.'
					? ''
					: options.dot
					? '(?!(?:^|\\/)\\.{1,2}(?:$|\\/))'
					: '(?!\\.)';
			let self2 = this;
			function clearStateChar() {
				if (stateChar) {
					switch (stateChar) {
						case '*':
							re2 += star;
							hasMagic = true;
							break;
						case '?':
							re2 += qmark;
							hasMagic = true;
							break;
						default:
							re2 += '\\' + stateChar;
							break;
					}
					self2.debug('clearStateChar %j %j', stateChar, re2);
					stateChar = false;
				}
			}
			for (
				var i = 0, len = pattern.length, c;
				i < len && (c = pattern.charAt(i));
				i++
			) {
				this.debug('%s	%s %s %j', pattern, i, re2, c);
				if (escaping && reSpecials[c]) {
					re2 += '\\' + c;
					escaping = false;
					continue;
				}
				switch (c) {
					case '/':
						return false;
					case '\\':
						clearStateChar();
						escaping = true;
						continue;
					case '?':
					case '*':
					case '+':
					case '@':
					case '!':
						this.debug('%s	%s %s %j <-- stateChar', pattern, i, re2, c);
						if (inClass) {
							this.debug('  in class');
							if (c === '!' && i === classStart + 1) {
								c = '^';
							}
							re2 += c;
							continue;
						}
						self2.debug('call clearStateChar %j', stateChar);
						clearStateChar();
						stateChar = c;
						if (options.noext) {
							clearStateChar();
						}
						continue;
					case '(':
						if (inClass) {
							re2 += '(';
							continue;
						}
						if (!stateChar) {
							re2 += '\\(';
							continue;
						}
						patternListStack.push({
							type: stateChar,
							start: i - 1,
							reStart: re2.length,
							open: plTypes[stateChar].open,
							close: plTypes[stateChar].close,
						});
						re2 += stateChar === '!' ? '(?:(?!(?:' : '(?:';
						this.debug('plType %j %j', stateChar, re2);
						stateChar = false;
						continue;
					case ')':
						if (inClass || !patternListStack.length) {
							re2 += '\\)';
							continue;
						}
						clearStateChar();
						hasMagic = true;
						var pl2 = patternListStack.pop();
						re2 += pl2.close;
						if (pl2.type === '!') {
							negativeLists.push(pl2);
						}
						pl2.reEnd = re2.length;
						continue;
					case '|':
						if (inClass || !patternListStack.length || escaping) {
							re2 += '\\|';
							escaping = false;
							continue;
						}
						clearStateChar();
						re2 += '|';
						continue;
					case '[':
						clearStateChar();
						if (inClass) {
							re2 += '\\' + c;
							continue;
						}
						inClass = true;
						classStart = i;
						reClassStart = re2.length;
						re2 += c;
						continue;
					case ']':
						if (i === classStart + 1 || !inClass) {
							re2 += '\\' + c;
							escaping = false;
							continue;
						}
						if (inClass) {
							var cs2 = pattern.substring(classStart + 1, i);
							try {
								RegExp('[' + cs2 + ']');
							} catch (er2) {
								var sp = this.parse(cs2, SUBPARSE);
								re2 = re2.substr(0, reClassStart) + '\\[' + sp[0] + '\\]';
								hasMagic = hasMagic || sp[1];
								inClass = false;
								continue;
							}
						}
						hasMagic = true;
						inClass = false;
						re2 += c;
						continue;
					default:
						clearStateChar();
						if (escaping) {
							escaping = false;
						} else if (reSpecials[c] && !(c === '^' && inClass)) {
							re2 += '\\';
						}
						re2 += c;
				}
			}
			if (inClass) {
				cs2 = pattern.substr(classStart + 1);
				sp = this.parse(cs2, SUBPARSE);
				re2 = re2.substr(0, reClassStart) + '\\[' + sp[0];
				hasMagic = hasMagic || sp[1];
			}
			for (pl2 = patternListStack.pop(); pl2; pl2 = patternListStack.pop()) {
				let tail = re2.slice(pl2.reStart + pl2.open.length);
				this.debug('setting tail', re2, pl2);
				tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_2, $1, $2) {
					if (!$2) {
						$2 = '\\';
					}
					return $1 + $1 + $2 + '|';
				});
				this.debug('tail=%j\n   %s', tail, tail, pl2, re2);
				let t =
					pl2.type === '*' ? star : pl2.type === '?' ? qmark : '\\' + pl2.type;
				hasMagic = true;
				re2 = re2.slice(0, pl2.reStart) + t + '\\(' + tail;
			}
			clearStateChar();
			if (escaping) {
				re2 += '\\\\';
			}
			let addPatternStart = false;
			switch (re2.charAt(0)) {
				case '.':
				case '[':
				case '(':
					addPatternStart = true;
			}
			for (let n = negativeLists.length - 1; n > -1; n--) {
				let nl2 = negativeLists[n];
				let nlBefore = re2.slice(0, nl2.reStart);
				let nlFirst = re2.slice(nl2.reStart, nl2.reEnd - 8);
				let nlLast = re2.slice(nl2.reEnd - 8, nl2.reEnd);
				let nlAfter = re2.slice(nl2.reEnd);
				nlLast += nlAfter;
				let openParensBefore = nlBefore.split('(').length - 1;
				let cleanAfter = nlAfter;
				for (i = 0; i < openParensBefore; i++) {
					cleanAfter = cleanAfter.replace(/\)[+*?]?/, '');
				}
				nlAfter = cleanAfter;
				let dollar = '';
				if (nlAfter === '' && isSub !== SUBPARSE) {
					dollar = '$';
				}
				let newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
				re2 = newRe;
			}
			if (re2 !== '' && hasMagic) {
				re2 = '(?=.)' + re2;
			}
			if (addPatternStart) {
				re2 = patternStart + re2;
			}
			if (isSub === SUBPARSE) {
				return [re2, hasMagic];
			}
			if (!hasMagic) {
				return globUnescape(pattern);
			}
			let flags = options.nocase ? 'i' : '';
			try {
				var regExp = new RegExp('^' + re2 + '$', flags);
			} catch (er2) {
				return new RegExp('$.');
			}
			regExp._glob = pattern;
			regExp._src = re2;
			return regExp;
		}
		minimatch.makeRe = function (pattern, options) {
			return new Minimatch(pattern, options || {}).makeRe();
		};
		Minimatch.prototype.makeRe = makeRe;
		function makeRe() {
			if (this.regexp || this.regexp === false) {
				return this.regexp;
			}
			let set = this.set;
			if (!set.length) {
				this.regexp = false;
				return this.regexp;
			}
			let options = this.options;
			let twoStar = options.noglobstar
				? star
				: options.dot
				? twoStarDot
				: twoStarNoDot;
			let flags = options.nocase ? 'i' : '';
			let re2 = set
				.map(function (pattern) {
					return pattern
						.map(function (p) {
							return p === GLOBSTAR
								? twoStar
								: typeof p === 'string'
								? regExpEscape(p)
								: p._src;
						})
						.join('\\/');
				})
				.join('|');
			re2 = '^(?:' + re2 + ')$';
			if (this.negate) {
				re2 = '^(?!' + re2 + ').*$';
			}
			try {
				this.regexp = new RegExp(re2, flags);
			} catch (ex) {
				this.regexp = false;
			}
			return this.regexp;
		}
		minimatch.match = function (list, pattern, options) {
			options = options || {};
			let mm = new Minimatch(pattern, options);
			list = list.filter(function (f) {
				return mm.match(f);
			});
			if (mm.options.nonull && !list.length) {
				list.push(pattern);
			}
			return list;
		};
		Minimatch.prototype.match = match;
		function match(f, partial) {
			this.debug('match', f, this.pattern);
			if (this.comment) {
				return false;
			}
			if (this.empty) {
				return f === '';
			}
			if (f === '/' && partial) {
				return true;
			}
			let options = this.options;
			if (path.sep !== '/') {
				f = f.split(path.sep).join('/');
			}
			f = f.split(slashSplit);
			this.debug(this.pattern, 'split', f);
			let set = this.set;
			this.debug(this.pattern, 'set', set);
			let filename;
			let i;
			for (i = f.length - 1; i >= 0; i--) {
				filename = f[i];
				if (filename) {
					break;
				}
			}
			for (i = 0; i < set.length; i++) {
				let pattern = set[i];
				let file = f;
				if (options.matchBase && pattern.length === 1) {
					file = [filename];
				}
				let hit = this.matchOne(file, pattern, partial);
				if (hit) {
					if (options.flipNegate) {
						return true;
					}
					return !this.negate;
				}
			}
			if (options.flipNegate) {
				return false;
			}
			return this.negate;
		}
		Minimatch.prototype.matchOne = function (file, pattern, partial) {
			let options = this.options;
			this.debug('matchOne', { this: this, file, pattern });
			this.debug('matchOne', file.length, pattern.length);
			for (
				var fi2 = 0, pi2 = 0, fl2 = file.length, pl2 = pattern.length;
				fi2 < fl2 && pi2 < pl2;
				fi2++, pi2++
			) {
				this.debug('matchOne loop');
				let p = pattern[pi2];
				let f = file[fi2];
				this.debug(pattern, p, f);
				if (p === false) {
					return false;
				}
				if (p === GLOBSTAR) {
					this.debug('GLOBSTAR', [pattern, p, f]);
					let fr2 = fi2;
					let pr2 = pi2 + 1;
					if (pr2 === pl2) {
						this.debug('** at the end');
						for (; fi2 < fl2; fi2++) {
							if (
								file[fi2] === '.' ||
								file[fi2] === '..' ||
								(!options.dot && file[fi2].charAt(0) === '.')
							) {
								return false;
							}
						}
						return true;
					}
					while (fr2 < fl2) {
						let swallowee = file[fr2];
						this.debug('\nglobstar while', file, fr2, pattern, pr2, swallowee);
						if (this.matchOne(file.slice(fr2), pattern.slice(pr2), partial)) {
							this.debug('globstar found match!', fr2, fl2, swallowee);
							return true;
						} else {
							if (
								swallowee === '.' ||
								swallowee === '..' ||
								(!options.dot && swallowee.charAt(0) === '.')
							) {
								this.debug('dot detected!', file, fr2, pattern, pr2);
								break;
							}
							this.debug('globstar swallow a segment, and continue');
							fr2++;
						}
					}
					if (partial) {
						this.debug('\n>>> no match, partial?', file, fr2, pattern, pr2);
						if (fr2 === fl2) {
							return true;
						}
					}
					return false;
				}
				var hit;
				if (typeof p === 'string') {
					if (options.nocase) {
						hit = f.toLowerCase() === p.toLowerCase();
					} else {
						hit = f === p;
					}
					this.debug('string match', p, f, hit);
				} else {
					hit = f.match(p);
					this.debug('pattern match', p, f, hit);
				}
				if (!hit) {
					return false;
				}
			}
			if (fi2 === fl2 && pi2 === pl2) {
				return true;
			} else if (fi2 === fl2) {
				return partial;
			} else if (pi2 === pl2) {
				let emptyFileEnd = fi2 === fl2 - 1 && file[fi2] === '';
				return emptyFileEnd;
			}
			throw new Error('wtf?');
		};
		function globUnescape(s) {
			return s.replace(/\\(.)/g, '$1');
		}
		function regExpEscape(s) {
			return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
		}
	},
});

// client/node_modules/vscode-languageclient/lib/common/fileOperations.js
let require_fileOperations = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/fileOperations.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.WillDeleteFilesFeature = exports.WillRenameFilesFeature = exports.WillCreateFilesFeature = exports.DidDeleteFilesFeature = exports.DidRenameFilesFeature = exports.DidCreateFilesFeature = void 0;
		let code = require('vscode');
		let minimatch = require_minimatch();
		let proto = require_main3();
		let UUID = require_uuid();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		function access(target, key) {
			return target[key];
		}
		function assign(target, key, value) {
			target[key] = value;
		}
		var FileOperationFeature = class {
			constructor(
				client,
				event,
				registrationType,
				clientCapability,
				serverCapability
			) {
				this._filters = new Map();
				this._client = client;
				this._event = event;
				this._registrationType = registrationType;
				this._clientCapability = clientCapability;
				this._serverCapability = serverCapability;
			}
			get registrationType() {
				return this._registrationType;
			}
			fillClientCapabilities(capabilities) {
				const value = ensure(
					ensure(capabilities, 'workspace'),
					'fileOperations'
				);
				assign(value, 'dynamicRegistration', true);
				assign(value, this._clientCapability, true);
			}
			initialize(capabilities) {
				const options = capabilities.workspace?.fileOperations;
				const capability =
					options !== void 0 ? access(options, this._serverCapability) : void 0;
				if (capability?.filters !== void 0) {
					try {
						this.register({
							id: UUID.generateUuid(),
							registerOptions: { filters: capability.filters },
						});
					} catch (e) {
						this._client.warn(
							`Ignoring invalid glob pattern for ${this._serverCapability} registration: ${e}`
						);
					}
				}
			}
			register(data) {
				if (!this._listener) {
					this._listener = this._event(this.send, this);
				}
				const minimatchFilter = data.registerOptions.filters.map((filter) => {
					const matcher = new minimatch.Minimatch(
						filter.pattern.glob,
						FileOperationFeature.asMinimatchOptions(filter.pattern.options)
					);
					if (!matcher.makeRe()) {
						throw new Error(`Invalid pattern ${filter.pattern.glob}!`);
					}
					return {
						scheme: filter.scheme,
						matcher,
						kind: filter.pattern.matches,
					};
				});
				this._filters.set(data.id, minimatchFilter);
			}
			unregister(id) {
				this._filters.delete(id);
				if (this._filters.size === 0 && this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
			dispose() {
				this._filters.clear();
				if (this._listener) {
					this._listener.dispose();
					this._listener = void 0;
				}
			}
			getFileType(uri) {
				return FileOperationFeature.getFileType(uri);
			}
			async filter(event, prop) {
				const fileMatches = await Promise.all(
					event.files.map(async (item) => {
						const uri = prop(item);
						const path = uri.fsPath.replace(/\\/g, '/');
						for (const filters of this._filters.values()) {
							for (const filter of filters) {
								if (filter.scheme !== void 0 && filter.scheme !== uri.scheme) {
									continue;
								}
								if (filter.matcher.match(path)) {
									if (filter.kind === void 0) {
										return true;
									}
									const fileType = await this.getFileType(uri);
									if (fileType === void 0) {
										this._client.error(
											`Failed to determine file type for ${uri.toString()}.`
										);
										return true;
									}
									if (
										(fileType === code.FileType.File &&
											filter.kind === proto.FileOperationPatternKind.file) ||
										(fileType === code.FileType.Directory &&
											filter.kind === proto.FileOperationPatternKind.folder)
									) {
										return true;
									}
								} else if (
									filter.kind === proto.FileOperationPatternKind.folder
								) {
									const fileType = await FileOperationFeature.getFileType(uri);
									if (
										fileType === code.FileType.Directory &&
										filter.matcher.match(`${path}/`)
									) {
										return true;
									}
								}
							}
						}
						return false;
					})
				);
				const files = event.files.filter((_2, index) => fileMatches[index]);
				return { ...event, files };
			}
			static async getFileType(uri) {
				try {
					return (await code.workspace.fs.stat(uri)).type;
				} catch (e) {
					return void 0;
				}
			}
			static asMinimatchOptions(options) {
				if (options === void 0) {
					return void 0;
				}
				if (options.ignoreCase === true) {
					return { nocase: true };
				}
				return void 0;
			}
		};
		let NotificationFileOperationFeature = class extends FileOperationFeature {
			constructor(
				client,
				event,
				notificationType,
				clientCapability,
				serverCapability,
				accessUri,
				createParams
			) {
				super(
					client,
					event,
					notificationType,
					clientCapability,
					serverCapability
				);
				this._notificationType = notificationType;
				this._accessUri = accessUri;
				this._createParams = createParams;
			}
			async send(originalEvent) {
				const filteredEvent = await this.filter(originalEvent, this._accessUri);
				if (filteredEvent.files.length) {
					const next = async (event) => {
						return this._client.sendNotification(
							this._notificationType,
							this._createParams(event)
						);
					};
					return this.doSend(filteredEvent, next);
				}
			}
		};
		let CachingNotificationFileOperationFeature = class extends NotificationFileOperationFeature {
			constructor() {
				super(...arguments);
				this._fsPathFileTypes = new Map();
			}
			async getFileType(uri) {
				const fsPath = uri.fsPath;
				if (this._fsPathFileTypes.has(fsPath)) {
					return this._fsPathFileTypes.get(fsPath);
				}
				const type = await FileOperationFeature.getFileType(uri);
				if (type) {
					this._fsPathFileTypes.set(fsPath, type);
				}
				return type;
			}
			async cacheFileTypes(event, prop) {
				await this.filter(event, prop);
			}
			clearFileTypeCache() {
				this._fsPathFileTypes.clear();
			}
			unregister(id) {
				super.unregister(id);
				if (this._filters.size === 0 && this._willListener) {
					this._willListener.dispose();
					this._willListener = void 0;
				}
			}
			dispose() {
				super.dispose();
				if (this._willListener) {
					this._willListener.dispose();
					this._willListener = void 0;
				}
			}
		};
		let DidCreateFilesFeature = class extends NotificationFileOperationFeature {
			constructor(client) {
				super(
					client,
					code.workspace.onDidCreateFiles,
					proto.DidCreateFilesNotification.type,
					'didCreate',
					'didCreate',
					(i) => i,
					client.code2ProtocolConverter.asDidCreateFilesParams
				);
			}
			doSend(event, next) {
				const middleware = this._client.clientOptions.middleware?.workspace;
				return middleware?.didCreateFiles
					? middleware.didCreateFiles(event, next)
					: next(event);
			}
		};
		exports.DidCreateFilesFeature = DidCreateFilesFeature;
		let DidRenameFilesFeature = class extends CachingNotificationFileOperationFeature {
			constructor(client) {
				super(
					client,
					code.workspace.onDidRenameFiles,
					proto.DidRenameFilesNotification.type,
					'didRename',
					'didRename',
					(i) => i.oldUri,
					client.code2ProtocolConverter.asDidRenameFilesParams
				);
			}
			register(data) {
				if (!this._willListener) {
					this._willListener = code.workspace.onWillRenameFiles(
						this.willRename,
						this
					);
				}
				super.register(data);
			}
			willRename(e) {
				e.waitUntil(this.cacheFileTypes(e, (i) => i.oldUri));
			}
			doSend(event, next) {
				this.clearFileTypeCache();
				const middleware = this._client.clientOptions.middleware?.workspace;
				return middleware?.didRenameFiles
					? middleware.didRenameFiles(event, next)
					: next(event);
			}
		};
		exports.DidRenameFilesFeature = DidRenameFilesFeature;
		let DidDeleteFilesFeature = class extends CachingNotificationFileOperationFeature {
			constructor(client) {
				super(
					client,
					code.workspace.onDidDeleteFiles,
					proto.DidDeleteFilesNotification.type,
					'didDelete',
					'didDelete',
					(i) => i,
					client.code2ProtocolConverter.asDidDeleteFilesParams
				);
			}
			register(data) {
				if (!this._willListener) {
					this._willListener = code.workspace.onWillDeleteFiles(
						this.willDelete,
						this
					);
				}
				super.register(data);
			}
			willDelete(e) {
				e.waitUntil(this.cacheFileTypes(e, (i) => i));
			}
			doSend(event, next) {
				this.clearFileTypeCache();
				const middleware = this._client.clientOptions.middleware?.workspace;
				return middleware?.didDeleteFiles
					? middleware.didDeleteFiles(event, next)
					: next(event);
			}
		};
		exports.DidDeleteFilesFeature = DidDeleteFilesFeature;
		let RequestFileOperationFeature = class extends FileOperationFeature {
			constructor(
				client,
				event,
				requestType,
				clientCapability,
				serverCapability,
				accessUri,
				createParams
			) {
				super(client, event, requestType, clientCapability, serverCapability);
				this._requestType = requestType;
				this._accessUri = accessUri;
				this._createParams = createParams;
			}
			async send(originalEvent) {
				const waitUntil = this.waitUntil(originalEvent);
				originalEvent.waitUntil(waitUntil);
			}
			async waitUntil(originalEvent) {
				const filteredEvent = await this.filter(originalEvent, this._accessUri);
				if (filteredEvent.files.length) {
					const next = (event) => {
						return this._client
							.sendRequest(this._requestType, this._createParams(event))
							.then(this._client.protocol2CodeConverter.asWorkspaceEdit);
					};
					return this.doSend(filteredEvent, next);
				} else {
					return void 0;
				}
			}
		};
		let WillCreateFilesFeature = class extends RequestFileOperationFeature {
			constructor(client) {
				super(
					client,
					code.workspace.onWillCreateFiles,
					proto.WillCreateFilesRequest.type,
					'willCreate',
					'willCreate',
					(i) => i,
					client.code2ProtocolConverter.asWillCreateFilesParams
				);
			}
			doSend(event, next) {
				const middleware = this._client.clientOptions.middleware?.workspace;
				return middleware?.willCreateFiles
					? middleware.willCreateFiles(event, next)
					: next(event);
			}
		};
		exports.WillCreateFilesFeature = WillCreateFilesFeature;
		let WillRenameFilesFeature = class extends RequestFileOperationFeature {
			constructor(client) {
				super(
					client,
					code.workspace.onWillRenameFiles,
					proto.WillRenameFilesRequest.type,
					'willRename',
					'willRename',
					(i) => i.oldUri,
					client.code2ProtocolConverter.asWillRenameFilesParams
				);
			}
			doSend(event, next) {
				const middleware = this._client.clientOptions.middleware?.workspace;
				return middleware?.willRenameFiles
					? middleware.willRenameFiles(event, next)
					: next(event);
			}
		};
		exports.WillRenameFilesFeature = WillRenameFilesFeature;
		let WillDeleteFilesFeature = class extends RequestFileOperationFeature {
			constructor(client) {
				super(
					client,
					code.workspace.onWillDeleteFiles,
					proto.WillDeleteFilesRequest.type,
					'willDelete',
					'willDelete',
					(i) => i,
					client.code2ProtocolConverter.asWillDeleteFilesParams
				);
			}
			doSend(event, next) {
				const middleware = this._client.clientOptions.middleware?.workspace;
				return middleware?.willDeleteFiles
					? middleware.willDeleteFiles(event, next)
					: next(event);
			}
		};
		exports.WillDeleteFilesFeature = WillDeleteFilesFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/linkedEditingRange.js
let require_linkedEditingRange = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/linkedEditingRange.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.LinkedEditingFeature = void 0;
		let code = require('vscode');
		let proto = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let LinkedEditingFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(client, proto.LinkedEditingRangeRequest.type);
			}
			fillClientCapabilities(capabilities) {
				const linkedEditingSupport = ensure(
					ensure(capabilities, 'textDocument'),
					'linkedEditingRange'
				);
				linkedEditingSupport.dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				let [id, options] = this.getRegistration(
					documentSelector,
					capabilities.linkedEditingRangeProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const provider = {
					provideLinkedEditingRanges: (document2, position, token) => {
						const client = this._client;
						const provideLinkedEditing = (document3, position2, token2) => {
							return client
								.sendRequest(
									proto.LinkedEditingRangeRequest.type,
									client.code2ProtocolConverter.asTextDocumentPositionParams(
										document3,
										position2
									),
									token2
								)
								.then(
									client.protocol2CodeConverter.asLinkedEditingRanges,
									(error) => {
										return client.handleFailedRequest(
											proto.LinkedEditingRangeRequest.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideLinkedEditingRange
							? middleware.provideLinkedEditingRange(
									document2,
									position,
									token,
									provideLinkedEditing
							  )
							: provideLinkedEditing(document2, position, token);
					},
				};
				return [
					code.languages.registerLinkedEditingRangeProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		exports.LinkedEditingFeature = LinkedEditingFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/proposed.diagnostic.js
let require_proposed_diagnostic2 = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/proposed.diagnostic.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.DiagnosticFeature = exports.vsdiag = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let uuid_1 = require_uuid();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let vsdiag;
		(function (vsdiag2) {
			let DocumentDiagnosticReportKind;
			(function (DocumentDiagnosticReportKind2) {
				DocumentDiagnosticReportKind2['full'] = 'full';
				DocumentDiagnosticReportKind2['unChanged'] = 'unChanged';
			})(
				(DocumentDiagnosticReportKind =
					vsdiag2.DocumentDiagnosticReportKind ||
					(vsdiag2.DocumentDiagnosticReportKind = {}))
			);
		})((vsdiag = exports.vsdiag || (exports.vsdiag = {})));
		let RequestStateKind;
		(function (RequestStateKind2) {
			RequestStateKind2['active'] = 'open';
			RequestStateKind2['reschedule'] = 'reschedule';
			RequestStateKind2['outDated'] = 'drop';
		})(RequestStateKind || (RequestStateKind = {}));
		let EditorTracker = class {
			constructor() {
				this.open = new Set();
				const openTabsHandler = () => {
					this.open.clear();
					if (vscode_1.window.tabs !== void 0) {
						for (const tab of vscode_1.window.tabs) {
							if (tab.resource !== void 0) {
								this.open.add(tab.resource.toString());
							}
						}
					} else if (vscode_1.window.openEditors !== void 0) {
						for (const info of vscode_1.window.openEditors) {
							if (info.resource !== void 0) {
								this.open.add(info.resource.toString());
							}
						}
					}
				};
				openTabsHandler();
				if (vscode_1.window.onDidChangeTabs !== void 0) {
					this.disposable = vscode_1.window.onDidChangeTabs(openTabsHandler);
				} else if (vscode_1.window.onDidChangeOpenEditors !== void 0) {
					this.disposable = vscode_1.window.onDidChangeOpenEditors(
						openTabsHandler
					);
				} else {
					this.disposable = { dispose: () => {} };
				}
			}
			dispose() {
				this.disposable.dispose();
			}
			isActive(textDocument) {
				return vscode_1.window.activeTextEditor?.document === textDocument;
			}
			isVisible(textDocument) {
				return this.open.has(textDocument.uri.toString());
			}
		};
		let PullState;
		(function (PullState2) {
			PullState2[(PullState2['document'] = 1)] = 'document';
			PullState2[(PullState2['workspace'] = 2)] = 'workspace';
		})(PullState || (PullState = {}));
		let DocumentPullStateTracker = class {
			constructor() {
				this.documentPullStates = new Map();
				this.workspacePullStates = new Map();
			}
			track(kind, document2, arg1) {
				const states =
					kind === PullState.document
						? this.documentPullStates
						: this.workspacePullStates;
				const [key, uri, version] =
					typeof document2 === 'string'
						? [document2, vscode_1.Uri.parse(document2), arg1]
						: [document2.uri.toString(), document2.uri, document2.version];
				let state = states.get(key);
				if (state === void 0) {
					state = { document: uri, pulledVersion: version, resultId: void 0 };
					states.set(key, state);
				}
				return state;
			}
			update(kind, document2, arg1, arg2) {
				const states =
					kind === PullState.document
						? this.documentPullStates
						: this.workspacePullStates;
				const [key, uri, version, resultId] =
					typeof document2 === 'string'
						? [document2, vscode_1.Uri.parse(document2), arg1, arg2]
						: [
								document2.uri.toString(),
								document2.uri,
								document2.version,
								arg1,
						  ];
				let state = states.get(key);
				if (state === void 0) {
					state = { document: uri, pulledVersion: version, resultId };
					states.set(key, state);
				} else {
					state.pulledVersion = version;
					state.resultId = resultId;
				}
			}
			unTrack(kind, textDocument) {
				const states =
					kind === PullState.document
						? this.documentPullStates
						: this.workspacePullStates;
				states.delete(textDocument.uri.toString());
			}
			tracks(kind, document2) {
				const key =
					typeof document2 === 'string' ? document2 : document2.uri.toString();
				const states =
					kind === PullState.document
						? this.documentPullStates
						: this.workspacePullStates;
				return states.has(key);
			}
			getResultId(kind, textDocument) {
				const states =
					kind === PullState.document
						? this.documentPullStates
						: this.workspacePullStates;
				return states.get(textDocument.uri.toString())?.resultId;
			}
			getAllResultIds() {
				const result = [];
				for (let [uri, value] of this.workspacePullStates) {
					if (this.documentPullStates.has(uri)) {
						value = this.documentPullStates.get(uri);
					}
					if (value.resultId !== void 0) {
						result.push({ uri, value: value.resultId });
					}
				}
				return result;
			}
		};
		let DiagnosticRequestor = class {
			constructor(client, editorTracker, options) {
				this.client = client;
				this.editorTracker = editorTracker;
				this.options = options;
				this.isDisposed = false;
				this.onDidChangeDiagnosticsEmitter = new vscode_1.EventEmitter();
				this.provider = this.createProvider();
				this.diagnostics = vscode_1.languages.createDiagnosticCollection(
					options.identifier
				);
				this.openRequests = new Map();
				this.documentStates = new DocumentPullStateTracker();
				this.workspaceErrorCounter = 0;
			}
			knows(kind, textDocument) {
				return this.documentStates.tracks(kind, textDocument);
			}
			pull(textDocument, cb) {
				this.pullAsync(textDocument).then(
					() => {
						if (cb) {
							cb();
						}
					},
					(error) => {
						this.client.error(
							`Document pull failed for text document ${textDocument.uri.toString()}`,
							error,
							false
						);
					}
				);
			}
			async pullAsync(textDocument) {
				const key = textDocument.uri.toString();
				const version = textDocument.version;
				const currentRequestState = this.openRequests.get(key);
				const documentState = this.documentStates.track(
					PullState.document,
					textDocument
				);
				if (currentRequestState === void 0) {
					const tokenSource = new vscode_1.CancellationTokenSource();
					this.openRequests.set(key, {
						state: RequestStateKind.active,
						version,
						textDocument,
						tokenSource,
					});
					let report;
					let afterState;
					try {
						report = (await this.provider.provideDiagnostics(
							textDocument,
							documentState.resultId,
							tokenSource.token
						)) ?? { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] };
					} catch (error) {
						if (
							error instanceof client_1.LSPCancellationError &&
							vscode_languageserver_protocol_1.Proposed.DiagnosticServerCancellationData.is(
								error.data
							) &&
							error.data.retriggerRequest === false
						) {
							afterState = { state: RequestStateKind.outDated, textDocument };
						}
						if (
							afterState === void 0 &&
							error instanceof vscode_1.CancellationError
						) {
							afterState = { state: RequestStateKind.reschedule, textDocument };
						} else {
							throw error;
						}
					}
					afterState = afterState ?? this.openRequests.get(key);
					if (afterState === void 0) {
						this.client.error(
							`Lost request state in diagnostic pull model. Clearing diagnostics for ${key}`
						);
						this.diagnostics.delete(textDocument.uri);
						return;
					}
					this.openRequests.delete(key);
					if (!this.editorTracker.isVisible(textDocument)) {
						this.documentStates.unTrack(PullState.document, textDocument);
						return;
					}
					if (afterState.state === RequestStateKind.outDated) {
						return;
					}
					if (report !== void 0) {
						if (report.kind === vsdiag.DocumentDiagnosticReportKind.full) {
							this.diagnostics.set(textDocument.uri, report.items);
						}
						documentState.pulledVersion = version;
						documentState.resultId = report.resultId;
					}
					if (afterState.state === RequestStateKind.reschedule) {
						this.pull(textDocument);
					}
				} else {
					if (currentRequestState.state === RequestStateKind.active) {
						currentRequestState.tokenSource.cancel();
						this.openRequests.set(key, {
							state: RequestStateKind.reschedule,
							textDocument: currentRequestState.textDocument,
						});
					} else if (currentRequestState.state === RequestStateKind.outDated) {
						this.openRequests.set(key, {
							state: RequestStateKind.reschedule,
							textDocument: currentRequestState.textDocument,
						});
					}
				}
			}
			cleanupPull(textDocument) {
				const key = textDocument.uri.toString();
				const request = this.openRequests.get(key);
				if (
					this.options.workspaceDiagnostics ||
					this.options.interFileDependencies
				) {
					if (request !== void 0) {
						this.openRequests.set(key, {
							state: RequestStateKind.reschedule,
							textDocument,
						});
					} else {
						this.pull(textDocument);
					}
				} else {
					if (request !== void 0) {
						if (request.state === RequestStateKind.active) {
							request.tokenSource.cancel();
						}
						this.openRequests.set(key, {
							state: RequestStateKind.outDated,
							textDocument,
						});
					}
					this.diagnostics.delete(textDocument.uri);
				}
			}
			pullWorkspace() {
				this.pullWorkspaceAsync().then(
					() => {
						this.workspaceTimeout = (0,
						vscode_languageserver_protocol_1.RAL)().timer.setTimeout(() => {
							this.pullWorkspace();
						}, 2e3);
					},
					(error) => {
						if (
							!(error instanceof client_1.LSPCancellationError) &&
							!vscode_languageserver_protocol_1.Proposed.DiagnosticServerCancellationData.is(
								error.data
							)
						) {
							this.client.error(
								`Workspace diagnostic pull failed.`,
								error,
								false
							);
							this.workspaceErrorCounter++;
						}
						if (this.workspaceErrorCounter <= 5) {
							this.workspaceTimeout = (0,
							vscode_languageserver_protocol_1.RAL)().timer.setTimeout(() => {
								this.pullWorkspace();
							}, 2e3);
						}
					}
				);
			}
			async pullWorkspaceAsync() {
				if (!this.provider.provideWorkspaceDiagnostics) {
					return;
				}
				if (this.workspaceCancellation !== void 0) {
					this.workspaceCancellation.cancel();
					this.workspaceCancellation = void 0;
				}
				this.workspaceCancellation = new vscode_1.CancellationTokenSource();
				const previousResultIds = this.documentStates
					.getAllResultIds()
					.map((item) => {
						return {
							uri: this.client.protocol2CodeConverter.asUri(item.uri),
							value: item.value,
						};
					});
				await this.provider.provideWorkspaceDiagnostics(
					previousResultIds,
					this.workspaceCancellation.token,
					(chunk) => {
						if (!chunk || this.isDisposed) {
							return;
						}
						for (const item of chunk.items) {
							if (item.kind === vsdiag.DocumentDiagnosticReportKind.full) {
								if (
									!this.documentStates.tracks(
										PullState.document,
										item.uri.toString()
									)
								) {
									this.diagnostics.set(item.uri, item.items);
								}
							}
							this.documentStates.update(
								PullState.workspace,
								item.uri.toString(),
								item.version ?? void 0,
								item.resultId
							);
						}
					}
				);
			}
			createProvider() {
				const result = {
					onDidChangeDiagnostics: this.onDidChangeDiagnosticsEmitter.event,
					provideDiagnostics: (textDocument, previousResultId, token) => {
						const provideDiagnostics = (
							textDocument2,
							previousResultId2,
							token2
						) => {
							const params = {
								identifier: this.options.identifier,
								textDocument: {
									uri: this.client.code2ProtocolConverter.asUri(
										textDocument2.uri
									),
								},
								previousResultId: previousResultId2,
							};
							return this.client
								.sendRequest(
									vscode_languageserver_protocol_1.Proposed
										.DocumentDiagnosticRequest.type,
									params,
									token2
								)
								.then(
									(result2) => {
										if (
											result2 === void 0 ||
											result2 === null ||
											this.isDisposed
										) {
											return {
												kind: vsdiag.DocumentDiagnosticReportKind.full,
												items: [],
											};
										}
										if (
											result2.kind ===
											vscode_languageserver_protocol_1.Proposed
												.DocumentDiagnosticReportKind.full
										) {
											return {
												kind: vsdiag.DocumentDiagnosticReportKind.full,
												resultId: result2.resultId,
												items: this.client.protocol2CodeConverter.asDiagnostics(
													result2.items
												),
											};
										} else {
											return {
												kind: vsdiag.DocumentDiagnosticReportKind.unChanged,
												resultId: result2.resultId,
											};
										}
									},
									(error) => {
										return this.client.handleFailedRequest(
											vscode_languageserver_protocol_1.Proposed
												.DocumentDiagnosticRequest.type,
											token2,
											error,
											{
												kind: vsdiag.DocumentDiagnosticReportKind.full,
												items: [],
											}
										);
									}
								);
						};
						const middleware = this.client.clientOptions.middleware;
						return middleware.provideDiagnostics
							? middleware.provideDiagnostics(
									textDocument,
									previousResultId,
									token,
									provideDiagnostics
							  )
							: provideDiagnostics(textDocument, previousResultId, token);
					},
				};
				if (this.options.workspaceDiagnostics) {
					result.provideWorkspaceDiagnostics = (
						resultIds,
						token,
						resultReporter
					) => {
						const convertReport = (report) => {
							if (
								report.kind ===
								vscode_languageserver_protocol_1.Proposed
									.DocumentDiagnosticReportKind.full
							) {
								return {
									kind: vsdiag.DocumentDiagnosticReportKind.full,
									uri: this.client.protocol2CodeConverter.asUri(report.uri),
									resultId: report.resultId,
									version: report.version,
									items: this.client.protocol2CodeConverter.asDiagnostics(
										report.items
									),
								};
							} else {
								return {
									kind: vsdiag.DocumentDiagnosticReportKind.unChanged,
									uri: this.client.protocol2CodeConverter.asUri(report.uri),
									resultId: report.resultId,
									version: report.version,
								};
							}
						};
						const convertPreviousResultIds = (resultIds2) => {
							const converted = [];
							for (const item of resultIds2) {
								converted.push({
									uri: this.client.code2ProtocolConverter.asUri(item.uri),
									value: item.value,
								});
							}
							return converted;
						};
						const provideDiagnostics = (resultIds2, token2) => {
							const partialResultToken = (0, uuid_1.generateUuid)();
							const disposable = this.client.onProgress(
								vscode_languageserver_protocol_1.Proposed
									.WorkspaceDiagnosticRequest.partialResult,
								partialResultToken,
								(partialResult) => {
									if (partialResult === void 0 || partialResult === null) {
										resultReporter(null);
										return;
									}
									const converted = {
										items: [],
									};
									for (const item of partialResult.items) {
										converted.items.push(convertReport(item));
									}
									resultReporter(converted);
								}
							);
							const params = {
								identifier: this.options.identifier,
								previousResultIds: convertPreviousResultIds(resultIds2),
								partialResultToken,
							};
							return this.client
								.sendRequest(
									vscode_languageserver_protocol_1.Proposed
										.WorkspaceDiagnosticRequest.type,
									params,
									token2
								)
								.then(
									(result2) => {
										const converted = {
											items: [],
										};
										for (const item of result2.items) {
											converted.items.push(convertReport(item));
										}
										disposable.dispose();
										resultReporter(converted);
										return { items: [] };
									},
									(error) => {
										disposable.dispose();
										return this.client.handleFailedRequest(
											vscode_languageserver_protocol_1.Proposed
												.DocumentDiagnosticRequest.type,
											token2,
											error,
											{ items: [] }
										);
									}
								);
						};
						const middleware = this.client.clientOptions.middleware;
						return middleware.provideWorkspaceDiagnostics
							? middleware.provideWorkspaceDiagnostics(
									resultIds,
									token,
									resultReporter,
									provideDiagnostics
							  )
							: provideDiagnostics(resultIds, token, resultReporter);
					};
				}
				return result;
			}
			dispose() {
				this.isDisposed = true;
				this.workspaceCancellation?.cancel();
				this.workspaceTimeout?.dispose();
				for (const [key, request] of this.openRequests) {
					if (request.state === RequestStateKind.active) {
						request.tokenSource.cancel();
					}
					this.openRequests.set(key, {
						state: RequestStateKind.outDated,
						textDocument: request.textDocument,
					});
				}
			}
		};
		let BackgroundScheduler = class {
			constructor(diagnosticRequestor) {
				this.diagnosticRequestor = diagnosticRequestor;
				this.documents = new vscode_languageserver_protocol_1.LinkedMap();
			}
			add(textDocument) {
				const key = textDocument.uri.toString();
				if (this.documents.has(key)) {
					return;
				}
				this.documents.set(
					textDocument.uri.toString(),
					textDocument,
					vscode_languageserver_protocol_1.Touch.Last
				);
				this.trigger();
			}
			remove(textDocument) {
				const key = textDocument.uri.toString();
				if (this.documents.has(key)) {
					this.documents.delete(key);
					this.diagnosticRequestor.pull(textDocument);
				}
				if (this.documents.size === 0) {
					this.stop();
				} else if (textDocument === this.endDocument) {
					this.endDocument = this.documents.last;
				}
			}
			trigger() {
				if (this.intervalHandle !== void 0) {
					this.endDocument = this.documents.last;
					return;
				}
				this.endDocument = this.documents.last;
				this.intervalHandle = (0,
				vscode_languageserver_protocol_1.RAL)().timer.setInterval(() => {
					const document2 = this.documents.first;
					if (document2 !== void 0) {
						this.diagnosticRequestor.pull(document2);
						this.documents.set(
							document2.uri.toString(),
							document2,
							vscode_languageserver_protocol_1.Touch.Last
						);
						if (document2 === this.endDocument) {
							this.stop();
						}
					}
				}, 200);
			}
			dispose() {
				this.stop();
				this.documents.clear();
			}
			stop() {
				this.intervalHandle?.dispose();
				this.intervalHandle = void 0;
				this.endDocument = void 0;
			}
		};
		let DiagnosticFeatureProviderImpl = class {
			constructor(client, editorTracker, options) {
				const diagnosticPullOptions = client.clientOptions
					.diagnosticPullOptions ?? { onChange: true, onSave: false };
				const documentSelector = options.documentSelector;
				const disposables = [];
				const matches = (textDocument) => {
					return (
						vscode_1.languages.match(documentSelector, textDocument) > 0 &&
						editorTracker.isVisible(textDocument)
					);
				};
				this.diagnosticRequestor = new DiagnosticRequestor(
					client,
					editorTracker,
					options
				);
				this.backgroundScheduler = new BackgroundScheduler(
					this.diagnosticRequestor
				);
				const addToBackgroundIfNeeded = (textDocument) => {
					if (
						!matches(textDocument) ||
						!options.interFileDependencies ||
						this.activeTextDocument === textDocument
					) {
						return;
					}
					this.backgroundScheduler.add(textDocument);
				};
				this.activeTextDocument = vscode_1.window.activeTextEditor?.document;
				vscode_1.window.onDidChangeActiveTextEditor((editor) => {
					const oldActive = this.activeTextDocument;
					this.activeTextDocument = editor?.document;
					if (oldActive !== void 0) {
						addToBackgroundIfNeeded(oldActive);
					}
					if (this.activeTextDocument !== void 0) {
						this.backgroundScheduler.remove(this.activeTextDocument);
					}
				});
				const openFeature = client.getFeature(
					vscode_languageserver_protocol_1.DidOpenTextDocumentNotification
						.method
				);
				disposables.push(
					openFeature.onNotificationSent((event) => {
						const textDocument = event.original;
						if (matches(textDocument)) {
							this.diagnosticRequestor.pull(textDocument, () => {
								addToBackgroundIfNeeded(textDocument);
							});
						}
					})
				);
				for (const textDocument of vscode_1.workspace.textDocuments) {
					if (matches(textDocument)) {
						this.diagnosticRequestor.pull(textDocument, () => {
							addToBackgroundIfNeeded(textDocument);
						});
					}
				}
				if (diagnosticPullOptions.onChange) {
					const changeFeature = client.getFeature(
						vscode_languageserver_protocol_1.DidChangeTextDocumentNotification
							.method
					);
					disposables.push(
						changeFeature.onNotificationSent(async (event) => {
							const textDocument = event.original.document;
							if (
								(diagnosticPullOptions.filter === void 0 ||
									!diagnosticPullOptions.filter(
										textDocument,
										client_1.DiagnosticPullMode.onType
									)) &&
								this.diagnosticRequestor.knows(
									PullState.document,
									textDocument
								) &&
								event.original.contentChanges.length > 0
							) {
								this.diagnosticRequestor.pull(textDocument, () => {
									this.backgroundScheduler.trigger();
								});
							}
						})
					);
				}
				if (diagnosticPullOptions.onSave) {
					const saveFeature = client.getFeature(
						vscode_languageserver_protocol_1.DidSaveTextDocumentNotification
							.method
					);
					disposables.push(
						saveFeature.onNotificationSent((event) => {
							const textDocument = event.original;
							if (
								(diagnosticPullOptions.filter === void 0 ||
									!diagnosticPullOptions.filter(
										textDocument,
										client_1.DiagnosticPullMode.onSave
									)) &&
								this.diagnosticRequestor.knows(PullState.document, textDocument)
							) {
								this.diagnosticRequestor.pull(event.original, () => {
									this.backgroundScheduler.trigger();
								});
							}
						})
					);
				}
				const closeFeature = client.getFeature(
					vscode_languageserver_protocol_1.DidCloseTextDocumentNotification
						.method
				);
				disposables.push(
					closeFeature.onNotificationSent((event) => {
						const textDocument = event.original;
						this.diagnosticRequestor.cleanupPull(textDocument);
						this.backgroundScheduler.remove(textDocument);
					})
				);
				this.diagnosticRequestor.onDidChangeDiagnosticsEmitter.event(() => {
					for (const textDocument of vscode_1.workspace.textDocuments) {
						if (matches(textDocument)) {
							this.diagnosticRequestor.pull(textDocument);
						}
					}
				});
				if (
					options.workspaceDiagnostics === true &&
					options.identifier !== 'da348dc5-c30a-4515-9d98-31ff3be38d14'
				) {
					this.diagnosticRequestor.pullWorkspace();
				}
				this.disposable = vscode_1.Disposable.from(
					...disposables,
					this.backgroundScheduler,
					this.diagnosticRequestor
				);
			}
			get onDidChangeDiagnosticsEmitter() {
				return this.diagnosticRequestor.onDidChangeDiagnosticsEmitter;
			}
			get diagnostics() {
				return this.diagnosticRequestor.provider;
			}
		};
		let DiagnosticFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.Proposed.DocumentDiagnosticRequest
						.type
				);
				this.editorTracker = new EditorTracker();
			}
			fillClientCapabilities(capabilities) {
				let capability = ensure(
					ensure(capabilities, 'textDocument'),
					'diagnostic'
				);
				capability.dynamicRegistration = true;
				capability.relatedDocumentSupport = false;
			}
			initialize(capabilities, documentSelector) {
				const client = this._client;
				client.onRequest(
					vscode_languageserver_protocol_1.Proposed.DiagnosticRefreshRequest
						.type,
					async () => {
						for (const provider of this.getAllProviders()) {
							provider.onDidChangeDiagnosticsEmitter.fire();
						}
					}
				);
				let [id, options] = this.getRegistration(
					documentSelector,
					capabilities.diagnosticProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			dispose() {
				this.editorTracker.dispose();
				super.dispose();
			}
			registerLanguageProvider(options) {
				const provider = new DiagnosticFeatureProviderImpl(
					this._client,
					this.editorTracker,
					options
				);
				return [provider.disposable, provider];
			}
		};
		exports.DiagnosticFeature = DiagnosticFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/proposed.typeHierarchy.js
let require_proposed_typeHierarchy2 = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/proposed.typeHierarchy.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.TypeHierarchyFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = {};
			}
			return target[key];
		}
		let TypeHierarchyProvider = class {
			constructor(client) {
				this.client = client;
				this.middleware = client.clientOptions.middleware;
			}
			prepareTypeHierarchy(document2, position, token) {
				const client = this.client;
				const middleware = this.middleware;
				const prepareTypeHierarchy = (document3, position2, token2) => {
					const params = client.code2ProtocolConverter.asTextDocumentPositionParams(
						document3,
						position2
					);
					return client
						.sendRequest(
							vscode_languageserver_protocol_1.Proposed
								.TypeHierarchyPrepareRequest.type,
							params,
							token2
						)
						.then(
							(result) => {
								return client.protocol2CodeConverter.asTypeHierarchyItems(
									result
								);
							},
							(error) => {
								return client.handleFailedRequest(
									vscode_languageserver_protocol_1.Proposed
										.TypeHierarchyPrepareRequest.type,
									token2,
									error,
									null
								);
							}
						);
				};
				return middleware.prepareTypeHierarchy
					? middleware.prepareTypeHierarchy(
							document2,
							position,
							token,
							prepareTypeHierarchy
					  )
					: prepareTypeHierarchy(document2, position, token);
			}
			provideTypeHierarchySupertypes(item, token) {
				const client = this.client;
				const middleware = this.middleware;
				const provideTypeHierarchySupertypes = (item2, token2) => {
					const params = {
						item: client.code2ProtocolConverter.asTypeHierarchyItem(item2),
					};
					return client
						.sendRequest(
							vscode_languageserver_protocol_1.Proposed
								.TypeHierarchySupertypesRequest.type,
							params,
							token2
						)
						.then(
							(result) => {
								return client.protocol2CodeConverter.asTypeHierarchyItems(
									result
								);
							},
							(error) => {
								return client.handleFailedRequest(
									vscode_languageserver_protocol_1.Proposed
										.TypeHierarchySupertypesRequest.type,
									token2,
									error,
									null
								);
							}
						);
				};
				return middleware.provideTypeHierarchySupertypes
					? middleware.provideTypeHierarchySupertypes(
							item,
							token,
							provideTypeHierarchySupertypes
					  )
					: provideTypeHierarchySupertypes(item, token);
			}
			provideTypeHierarchySubtypes(item, token) {
				const client = this.client;
				const middleware = this.middleware;
				const provideTypeHierarchySubtypes = (item2, token2) => {
					const params = {
						item: client.code2ProtocolConverter.asTypeHierarchyItem(item2),
					};
					return client
						.sendRequest(
							vscode_languageserver_protocol_1.Proposed
								.TypeHierarchySubtypesRequest.type,
							params,
							token2
						)
						.then(
							(result) => {
								return client.protocol2CodeConverter.asTypeHierarchyItems(
									result
								);
							},
							(error) => {
								return client.handleFailedRequest(
									vscode_languageserver_protocol_1.Proposed
										.TypeHierarchySubtypesRequest.type,
									token2,
									error,
									null
								);
							}
						);
				};
				return middleware.provideTypeHierarchySubtypes
					? middleware.provideTypeHierarchySubtypes(
							item,
							token,
							provideTypeHierarchySubtypes
					  )
					: provideTypeHierarchySubtypes(item, token);
			}
		};
		let TypeHierarchyFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.Proposed.TypeHierarchyPrepareRequest
						.type
				);
			}
			fillClientCapabilities(cap) {
				const capabilities = cap;
				const capability = ensure(
					ensure(capabilities, 'textDocument'),
					'typeHierarchy'
				);
				capability.dynamicRegistration = true;
			}
			initialize(capabilities, documentSelector) {
				const [id, options] = this.getRegistration(
					documentSelector,
					capabilities.typeHierarchyProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const client = this._client;
				const provider = new TypeHierarchyProvider(client);
				return [
					vscode_1.languages.registerTypeHierarchyProvider(
						options.documentSelector,
						provider
					),
					provider,
				];
			}
		};
		exports.TypeHierarchyFeature = TypeHierarchyFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/proposed.inlineValues.js
let require_proposed_inlineValues = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/proposed.inlineValues.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.InlineValueFeature = void 0;
		let vscode_1 = require('vscode');
		let vscode_languageserver_protocol_1 = require_main3();
		let client_1 = require_client();
		function ensure(target, key) {
			if (target[key] === void 0) {
				target[key] = Object.create(null);
			}
			return target[key];
		}
		let InlineValueFeature = class extends client_1.TextDocumentFeature {
			constructor(client) {
				super(
					client,
					vscode_languageserver_protocol_1.Proposed.InlineValuesRequest.type
				);
			}
			fillClientCapabilities(capabilities) {
				ensure(
					ensure(capabilities, 'textDocument'),
					'inlineValues'
				).dynamicRegistration = true;
				ensure(
					ensure(capabilities, 'workspace'),
					'codeLens'
				).refreshSupport = true;
			}
			initialize(capabilities, documentSelector) {
				this._client.onRequest(
					vscode_languageserver_protocol_1.Proposed.InlineValuesRefreshRequest
						.type,
					async () => {
						for (const provider of this.getAllProviders()) {
							provider.onDidChangeInlineValues.fire();
						}
					}
				);
				const [id, options] = this.getRegistration(
					documentSelector,
					capabilities.inlineValuesProvider
				);
				if (!id || !options) {
					return;
				}
				this.register({ id, registerOptions: options });
			}
			registerLanguageProvider(options) {
				const eventEmitter = new vscode_1.EventEmitter();
				const provider = {
					onDidChangeInlineValues: eventEmitter.event,
					provideInlineValues: (document2, viewPort, context, token) => {
						const client = this._client;
						const provideInlineValues = (
							document3,
							viewPort2,
							context2,
							token2
						) => {
							const requestParams = {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(
									document3
								),
								viewPort: client.code2ProtocolConverter.asRange(viewPort2),
								context: client.code2ProtocolConverter.asInlineValuesContext(
									context2
								),
							};
							return client
								.sendRequest(
									vscode_languageserver_protocol_1.Proposed.InlineValuesRequest
										.type,
									requestParams,
									token2
								)
								.then(
									(values) =>
										client.protocol2CodeConverter.asInlineValues(values),
									(error) => {
										return client.handleFailedRequest(
											vscode_languageserver_protocol_1.Proposed
												.InlineValuesRequest.type,
											token2,
											error,
											null
										);
									}
								);
						};
						const middleware = client.clientOptions.middleware;
						return middleware.provideInlineValues
							? middleware.provideInlineValues(
									document2,
									viewPort,
									context,
									token,
									provideInlineValues
							  )
							: provideInlineValues(document2, viewPort, context, token);
					},
				};
				return [
					vscode_1.languages.registerInlineValuesProvider(
						options.documentSelector,
						provider
					),
					{ provider, onDidChangeInlineValues: eventEmitter },
				];
			}
		};
		exports.InlineValueFeature = InlineValueFeature;
	},
});

// client/node_modules/vscode-languageclient/lib/common/commonClient.js
let require_commonClient = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/commonClient.js'(
		exports
	) {
		'use strict';
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.ProposedFeatures = exports.CommonLanguageClient = void 0;
		let client_1 = require_client();
		let colorProvider_1 = require_colorProvider();
		let configuration_1 = require_configuration();
		let implementation_1 = require_implementation();
		let typeDefinition_1 = require_typeDefinition();
		let workspaceFolders_1 = require_workspaceFolders();
		let foldingRange_1 = require_foldingRange();
		let declaration_1 = require_declaration();
		let selectionRange_1 = require_selectionRange();
		let progress_1 = require_progress();
		let callHierarchy_1 = require_callHierarchy();
		let semanticTokens_1 = require_semanticTokens();
		let fileOperations_1 = require_fileOperations();
		let linkedEditingRange_1 = require_linkedEditingRange();
		let CommonLanguageClient = class extends client_1.BaseLanguageClient {
			constructor(id, name, clientOptions) {
				super(id, name, clientOptions);
			}
			registerProposedFeatures() {
				this.registerFeatures(ProposedFeatures.createAll(this));
			}
			registerBuiltinFeatures() {
				super.registerBuiltinFeatures();
				this.registerFeature(new configuration_1.ConfigurationFeature(this));
				this.registerFeature(new typeDefinition_1.TypeDefinitionFeature(this));
				this.registerFeature(new implementation_1.ImplementationFeature(this));
				this.registerFeature(new colorProvider_1.ColorProviderFeature(this));
				if (this.clientOptions.workspaceFolder === void 0) {
					this.registerFeature(
						new workspaceFolders_1.WorkspaceFoldersFeature(this)
					);
				}
				this.registerFeature(new foldingRange_1.FoldingRangeFeature(this));
				this.registerFeature(new declaration_1.DeclarationFeature(this));
				this.registerFeature(new selectionRange_1.SelectionRangeFeature(this));
				this.registerFeature(new progress_1.ProgressFeature(this));
				this.registerFeature(new callHierarchy_1.CallHierarchyFeature(this));
				this.registerFeature(new semanticTokens_1.SemanticTokensFeature(this));
				this.registerFeature(
					new linkedEditingRange_1.LinkedEditingFeature(this)
				);
				this.registerFeature(new fileOperations_1.DidCreateFilesFeature(this));
				this.registerFeature(new fileOperations_1.DidRenameFilesFeature(this));
				this.registerFeature(new fileOperations_1.DidDeleteFilesFeature(this));
				this.registerFeature(new fileOperations_1.WillCreateFilesFeature(this));
				this.registerFeature(new fileOperations_1.WillRenameFilesFeature(this));
				this.registerFeature(new fileOperations_1.WillDeleteFilesFeature(this));
			}
		};
		exports.CommonLanguageClient = CommonLanguageClient;
		let pd = require_proposed_diagnostic2();
		let pt = require_proposed_typeHierarchy2();
		let iv = require_proposed_inlineValues();
		let ProposedFeatures;
		(function (ProposedFeatures2) {
			function createAll(_client) {
				let result = [
					new pd.DiagnosticFeature(_client),
					new pt.TypeHierarchyFeature(_client),
					new iv.InlineValueFeature(_client),
				];
				return result;
			}
			ProposedFeatures2.createAll = createAll;
		})(
			(ProposedFeatures =
				exports.ProposedFeatures || (exports.ProposedFeatures = {}))
		);
	},
});

// client/node_modules/vscode-languageclient/lib/common/api.js
let require_api3 = __commonJS({
	'client/node_modules/vscode-languageclient/lib/common/api.js'(exports) {
		'use strict';
		let __createBinding =
			(exports && exports.__createBinding) ||
			(Object.create
				? function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						Object.defineProperty(o, k2, {
							enumerable: true,
							get: function () {
								return m[k];
							},
						});
				  }
				: function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						o[k2] = m[k];
				  });
		let __exportStar =
			(exports && exports.__exportStar) ||
			function (m, exports2) {
				for (let p in m) {
					if (
						p !== 'default' &&
						!Object.prototype.hasOwnProperty.call(exports2, p)
					) {
						__createBinding(exports2, m, p);
					}
				}
			};
		Object.defineProperty(exports, '__esModule', { value: true });
		__exportStar(require_main3(), exports);
		__exportStar(require_client(), exports);
		__exportStar(require_commonClient(), exports);
	},
});

// client/node_modules/vscode-languageserver-protocol/browser.js
let require_browser2 = __commonJS({
	'client/node_modules/vscode-languageserver-protocol/browser.js'(
		exports,
		module2
	) {
		'use strict';
		module2.exports = require_main3();
	},
});

// client/node_modules/vscode-languageclient/lib/browser/main.js
let require_main4 = __commonJS({
	'client/node_modules/vscode-languageclient/lib/browser/main.js'(exports) {
		'use strict';
		let __createBinding =
			(exports && exports.__createBinding) ||
			(Object.create
				? function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						Object.defineProperty(o, k2, {
							enumerable: true,
							get: function () {
								return m[k];
							},
						});
				  }
				: function (o, m, k, k2) {
						if (k2 === void 0) {
							k2 = k;
						}
						o[k2] = m[k];
				  });
		let __exportStar =
			(exports && exports.__exportStar) ||
			function (m, exports2) {
				for (let p in m) {
					if (
						p !== 'default' &&
						!Object.prototype.hasOwnProperty.call(exports2, p)
					) {
						__createBinding(exports2, m, p);
					}
				}
			};
		Object.defineProperty(exports, '__esModule', { value: true });
		exports.LanguageClient = void 0;
		let api_1 = require_api3();
		let browser_1 = require_browser2();
		__exportStar(require_browser2(), exports);
		__exportStar(require_api3(), exports);
		let LanguageClient2 = class extends api_1.CommonLanguageClient {
			constructor(id, name, clientOptions, worker) {
				super(id, name, clientOptions);
				this.worker = worker;
			}
			createMessageTransports(_encoding) {
				const reader = new browser_1.BrowserMessageReader(this.worker);
				const writer = new browser_1.BrowserMessageWriter(this.worker);
				return Promise.resolve({ reader, writer });
			}
			getLocale() {
				return 'en';
			}
		};
		exports.LanguageClient = LanguageClient2;
	},
});

// client/node_modules/vscode-languageclient/browser.js
let require_browser3 = __commonJS({
	'client/node_modules/vscode-languageclient/browser.js'(exports, module2) {
		'use strict';
		module2.exports = require_main4();
	},
});

// client/src/main.ts
__export(exports, {
	activate: () => activate,
});
let vscode2 = __toModule(require('vscode'));
let import_vscode_languageclient = __toModule(require_main4());
let import_browser = __toModule(require_browser3());

// client/src/supportedLanguages.ts
let vscode = __toModule(require('vscode'));
let LanguageInfo = class {
	constructor(languageId, wasmUri, suffixes) {
		this.languageId = languageId;
		this.wasmUri = wasmUri;
		this.suffixes = suffixes;
	}
};
let SupportedLanguages = class {
	constructor(context) {
		this._overrideConfigurations = new Map([
			[
				'python',
				{
					extension: 'ms-python.python',
					config: {
						completions: false,
						definitions: true,
						diagnostics: false,
						folding: false,
						highlights: false,
						outline: false,
						references: false,
						workspaceSymbols: true,
					},
				},
			],
			[
				'typescript',
				{
					extension: 'vscode.typescript-language-features',
					config: {
						completions: false,
						definitions: true,
						diagnostics: false,
						folding: false,
						highlights: false,
						outline: false,
						references: false,
						workspaceSymbols: true,
					},
				},
			],
		]);
		this._onDidChange = new vscode.EventEmitter();
		this.onDidChange = this._onDidChange.event;
		this._all = [
			new LanguageInfo(
				'c',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-c.wasm'
				).toString(),
				['c', 'i']
			),
			new LanguageInfo(
				'cpp',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-cpp.wasm'
				).toString(),
				[
					'cpp',
					'cc',
					'cxx',
					'c++',
					'hpp',
					'hh',
					'hxx',
					'h++',
					'h',
					'ii',
					'ino',
					'inl',
					'ipp',
					'ixx',
					'hpp.in',
					'h.in',
				]
			),
			new LanguageInfo(
				'csharp',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-c_sharp.wasm'
				).toString(),
				['cs']
			),
			new LanguageInfo(
				'go',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-go.wasm'
				).toString(),
				['go']
			),
			new LanguageInfo(
				'java',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-java.wasm'
				).toString(),
				['java']
			),
			new LanguageInfo(
				'php',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-php.wasm'
				).toString(),
				['php', 'php4', 'php5', 'phtml', 'ctp']
			),
			new LanguageInfo(
				'python',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-python.wasm'
				).toString(),
				['py', 'rpy', 'pyw', 'cpy', 'gyp', 'gypi', 'pyi', 'ipy']
			),
			new LanguageInfo(
				'rust',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-rust.wasm'
				).toString(),
				['rs']
			),
			new LanguageInfo(
				'typescript',
				vscode.Uri.joinPath(
					context.extensionUri,
					'./server/tree-sitter-typescript.wasm'
				).toString(),
				['ts', 'tsx', 'js', 'jsx']
			),
		];
		this._disposable = vscode.Disposable.from(
			vscode.extensions.onDidChange(this._reset, this),
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('anycode.language')) {
					this._reset();
				}
			})
		);
	}
	dispose() {
		this._onDidChange.dispose();
		this._disposable.dispose();
	}
	_reset() {
		this._tuples = void 0;
		this._onDidChange.fire(this);
	}
	getSupportedLanguages() {
		if (!this._tuples) {
			this._tuples = new Map();
			for (let info of this._all) {
				const config = vscode.workspace.getConfiguration('anycode', {
					languageId: info.languageId,
				});
				let overrideConfig;
				const overrideInfo = this._overrideConfigurations.get(info.languageId);
				if (
					overrideInfo &&
					vscode.extensions.getExtension(overrideInfo.extension)
				) {
					overrideConfig = overrideInfo.config;
				}
				const featureConfig = {
					...config.get(`language.features`),
					...overrideConfig,
				};
				const empty = Object.keys(featureConfig).every(
					(key) => !featureConfig[key]
				);
				if (empty) {
					continue;
				}
				this._tuples.set(info, featureConfig);
			}
		}
		return this._tuples;
	}
	getSupportedLanguagesAsSelector() {
		return Array.from(this.getSupportedLanguages().keys()).map(
			(info) => info.languageId
		);
	}
};

// client/node_modules/vscode-extension-telemetry/lib/telemetryReporter.web.min.js
let ue = __toModule(require('vscode'));
let import_vscode = __toModule(require('vscode'));
let po = Object.defineProperty;
let vu = (t) => po(t, '__esModule', { value: true });
let C = (t, e) => () => (t && (e = t((t = 0))), e);
let hu = (t, e) => {
	vu(t);
	for (let r in e) {
		po(t, r, { get: e[r], enumerable: true });
	}
};
let go;
let vo = C(() => {
	go = {
		Unknown: 0,
		NonRetryableStatus: 1,
		InvalidEvent: 2,
		SizeLimitExceeded: 3,
		KillSwitch: 4,
		QueueFull: 5,
	};
});
let mt;
let Xe;
let Oe;
let Ie;
let zr;
let gt;
let Sr;
let Cr;
let Ln;
let Un;
let rr;
let _n = C(() => {
	(mt = 'function'),
		(Xe = 'object'),
		(Oe = 'undefined'),
		(Ie = 'prototype'),
		(zr = 'hasOwnProperty'),
		(gt = Object),
		(Sr = gt[Ie]),
		(Cr = gt.assign),
		(Ln = gt.create),
		(Un = gt.defineProperty),
		(rr = Sr[zr]);
});
function ot() {
	return typeof globalThis !== Oe && globalThis
		? globalThis
		: typeof self !== Oe && self
		? self
		: typeof window !== Oe && window
		? window
		: typeof global !== Oe && global
		? global
		: null;
}
function Ir(t) {
	throw new TypeError(t);
}
function Dt(t) {
	let e = Ln;
	if (e) {
		return e(t);
	}
	if (t == null) {
		return {};
	}
	let r = typeof t;
	r !== Xe && r !== mt && Ir('Object prototype may only be an Object:' + t);
	function n() {}
	return (n[Ie] = t), new n();
}
let Di = C(() => {
	_n();
});
function H(t, e) {
	typeof e !== mt &&
		e !== null &&
		Ir('Class extends value ' + String(e) + ' is not a constructor or null'),
		Ai(t, e);
	function r() {
		this.constructor = t;
	}
	t[Ie] = e === null ? Dt(e) : ((r[Ie] = e[Ie]), new r());
}
let Rl;
let Ml;
let Su;
let yt;
let Ai;
let ho = C(() => {
	_n();
	Di();
	(Rl = (ot() || {}).Symbol),
		(Ml = (ot() || {}).Reflect),
		(Su = function (t) {
			for (var e, r = 1, n = arguments.length; r < n; r++) {
				e = arguments[r];
				for (let i in e) {
					Sr[zr].call(e, i) && (t[i] = e[i]);
				}
			}
			return t;
		}),
		(yt = Cr || Su),
		(Ai = function (t, e) {
			return (
				(Ai =
					gt.setPrototypeOf ||
					({ __proto__: [] } instanceof Array &&
						function (r, n) {
							r.__proto__ = n;
						}) ||
					function (r, n) {
						for (let i in n) {
							n[zr](i) && (r[i] = n[i]);
						}
					}),
				Ai(t, e)
			);
		});
});
let xo = C(() => {});
let ne = C(() => {
	_n();
	Di();
	ho();
	xo();
});
function jt(t, e) {
	return t && zn[At].hasOwnProperty.call(t, e);
}
function To(t) {
	return t && (t === zn[At] || t === Array[At]);
}
function Ri(t) {
	return To(t) || t === Function[At];
}
function nr(t) {
	if (t) {
		if (Vr) {
			return Vr(t);
		}
		let e = t[Iu] || t[At] || (t[On] ? t[On][At] : null);
		if (e) {
			return e;
		}
	}
	return null;
}
function Bn(t, e) {
	let r = [],
		n = zn.getOwnPropertyNames;
	if (n) {
		r = n(t);
	} else {
		for (let i in t) {
			typeof i === 'string' && jt(t, i) && r.push(i);
		}
	}
	if (r && r.length > 0) {
		for (let a = 0; a < r.length; a++) {
			e(r[a]);
		}
	}
}
function Mi(t, e, r) {
	return e !== On && typeof t[e] === Hn && (r || jt(t, e));
}
function Vn(t) {
	throw new TypeError('DynamicProto: ' + t);
}
function Tu(t) {
	let e = {};
	return (
		Bn(t, function (r) {
			!e[r] && Mi(t, r, false) && (e[r] = t[r]);
		}),
		e
	);
}
function Li(t, e) {
	for (let r = t.length - 1; r >= 0; r--) {
		if (t[r] === e) {
			return true;
		}
	}
	return false;
}
function Eu(t, e, r, n) {
	function i(s, u, l) {
		let f = u[l];
		if (f[Ni] && n) {
			let m = s[jn] || {};
			m[Br] !== false && (f = (m[u[Tr]] || {})[l] || f);
		}
		return function () {
			return f.apply(s, arguments);
		};
	}
	let a = {};
	Bn(r, function (s) {
		a[s] = i(e, r, s);
	});
	for (var o = nr(t), c = []; o && !Ri(o) && !Li(c, o); ) {
		Bn(o, function (s) {
			!a[s] && Mi(o, s, !Vr) && (a[s] = i(e, o, s));
		}),
			c.push(o),
			(o = nr(o));
	}
	return a;
}
function wu(t, e, r, n) {
	let i = null;
	if (t && jt(r, Tr)) {
		let a = t[jn] || {};
		if (
			((i = (a[r[Tr]] || {})[e]),
			i || Vn('Missing [' + e + '] ' + Hn),
			!i[Fi] && a[Br] !== false)
		) {
			for (
				var o = !jt(t, e), c = nr(t), s = [];
				o && c && !Ri(c) && !Li(s, c);

			) {
				let u = c[e];
				if (u) {
					o = u === n;
					break;
				}
				s.push(c), (c = nr(c));
			}
			try {
				o && (t[e] = i), (i[Fi] = 1);
			} catch (l) {
				a[Br] = false;
			}
		}
	}
	return i;
}
function Pu(t, e, r) {
	let n = e[t];
	return (
		n === r && (n = nr(e)[t]),
		typeof n !== Hn && Vn('[' + t + '] is not a ' + Hn),
		n
	);
}
function bu(t, e, r, n, i) {
	function a(s, u) {
		var l = function () {
			let f = wu(this, u, s, l) || Pu(u, s, l);
			return f.apply(this, arguments);
		};
		return (l[Ni] = 1), l;
	}
	if (!To(t)) {
		let o = (r[jn] = r[jn] || {}),
			c = (o[e] = o[e] || {});
		o[Br] !== false && (o[Br] = !!i),
			Bn(r, function (s) {
				Mi(r, s, false) &&
					r[s] !== n[s] &&
					((c[s] = r[s]),
					delete r[s],
					(!jt(t, s) || (t[s] && !t[s][Ni])) && (t[s] = a(t, s)));
			});
	}
}
function Du(t, e) {
	if (Vr) {
		for (let r = [], n = nr(e); n && !Ri(n) && !Li(r, n); ) {
			if (n === t) {
				return true;
			}
			r.push(n), (n = nr(n));
		}
	}
	return false;
}
function Ui(t, e) {
	return jt(t, At) ? t.name || e || So : ((t || {})[On] || {}).name || e || So;
}
function _i(t, e, r, n) {
	jt(t, At) || Vn('theClass is an invalid class definition.');
	let i = t[At];
	Du(i, e) ||
		Vn('[' + Ui(t) + '] is not in class hierarchy of [' + Ui(e) + ']');
	let a = null;
	jt(i, Tr)
		? (a = i[Tr])
		: ((a = Cu + Ui(t, '_') + '$' + Io), Io++, (i[Tr] = a));
	let o = _i[yo],
		c = !!o[ki];
	c && n && n[ki] !== void 0 && (c = !!n[ki]);
	let s = Tu(e),
		u = Eu(i, e, s, c);
	r(e, u);
	let l = !!Vr && !!o[Co];
	l && n && (l = !!n[Co]), bu(i, a, e, s, l !== false);
}
let On;
let At;
let Hn;
let jn;
let Ni;
let Tr;
let Cu;
let Fi;
let Br;
let yo;
let So;
let Iu;
let ki;
let Co;
let zn;
let Vr;
let Io;
let Au;
let W;
let Te = C(() => {
	(On = 'constructor'),
		(At = 'prototype'),
		(Hn = 'function'),
		(jn = '_dynInstFuncs'),
		(Ni = '_isDynProxy'),
		(Tr = '_dynClass'),
		(Cu = '_dynCls$'),
		(Fi = '_dynInstChk'),
		(Br = Fi),
		(yo = '_dfOpts'),
		(So = '_unknown_'),
		(Iu = '__proto__'),
		(ki = 'useBaseInst'),
		(Co = 'setInstFuncs'),
		(zn = Object),
		(Vr = zn.getPrototypeOf),
		(Io = 0);
	Au = { setInstFuncs: true, useBaseInst: true };
	_i[yo] = Au;
	W = _i;
});
let S;
let h;
let qr = C(() => {
	(function (t) {
		(t[(t.CRITICAL = 1)] = 'CRITICAL'), (t[(t.WARNING = 2)] = 'WARNING');
	})(S || (S = {}));
	h = {
		BrowserDoesNotSupportLocalStorage: 0,
		BrowserCannotReadLocalStorage: 1,
		BrowserCannotReadSessionStorage: 2,
		BrowserCannotWriteLocalStorage: 3,
		BrowserCannotWriteSessionStorage: 4,
		BrowserFailedRemovalFromLocalStorage: 5,
		BrowserFailedRemovalFromSessionStorage: 6,
		CannotSendEmptyTelemetry: 7,
		ClientPerformanceMathError: 8,
		ErrorParsingAISessionCookie: 9,
		ErrorPVCalc: 10,
		ExceptionWhileLoggingError: 11,
		FailedAddingTelemetryToBuffer: 12,
		FailedMonitorAjaxAbort: 13,
		FailedMonitorAjaxDur: 14,
		FailedMonitorAjaxOpen: 15,
		FailedMonitorAjaxRSC: 16,
		FailedMonitorAjaxSend: 17,
		FailedMonitorAjaxGetCorrelationHeader: 18,
		FailedToAddHandlerForOnBeforeUnload: 19,
		FailedToSendQueuedTelemetry: 20,
		FailedToReportDataLoss: 21,
		FlushFailed: 22,
		MessageLimitPerPVExceeded: 23,
		MissingRequiredFieldSpecification: 24,
		NavigationTimingNotSupported: 25,
		OnError: 26,
		SessionRenewalDateIsZero: 27,
		SenderNotInitialized: 28,
		StartTrackEventFailed: 29,
		StopTrackEventFailed: 30,
		StartTrackFailed: 31,
		StopTrackFailed: 32,
		TelemetrySampledAndNotSent: 33,
		TrackEventFailed: 34,
		TrackExceptionFailed: 35,
		TrackMetricFailed: 36,
		TrackPVFailed: 37,
		TrackPVFailedCalc: 38,
		TrackTraceFailed: 39,
		TransmissionFailed: 40,
		FailedToSetStorageBuffer: 41,
		FailedToRestoreStorageBuffer: 42,
		InvalidBackendResponse: 43,
		FailedToFixDepricatedValues: 44,
		InvalidDurationValue: 45,
		TelemetryEnvelopeInvalid: 46,
		CreateEnvelopeError: 47,
		CannotSerializeObject: 48,
		CannotSerializeObjectNonSerializable: 49,
		CircularReferenceDetected: 50,
		ClearAuthContextFailed: 51,
		ExceptionTruncated: 52,
		IllegalCharsInName: 53,
		ItemNotInArray: 54,
		MaxAjaxPerPVExceeded: 55,
		MessageTruncated: 56,
		NameTooLong: 57,
		SampleRateOutOfRange: 58,
		SetAuthContextFailed: 59,
		SetAuthContextFailedAccountName: 60,
		StringValueTooLong: 61,
		StartCalledMoreThanOnce: 62,
		StopCalledWithoutStart: 63,
		TelemetryInitializerFailed: 64,
		TrackArgumentsNotSpecified: 65,
		UrlTooLong: 66,
		SessionStorageBufferFull: 67,
		CannotAccessCookie: 68,
		IdTooLong: 69,
		InvalidEvent: 70,
		FailedMonitorAjaxSetRequestHeader: 71,
		SendBrowserInfoOnUserInit: 72,
		PluginException: 73,
		NotificationException: 74,
		SnippetScriptLoadFailure: 99,
		InvalidInstrumentationKey: 100,
		CannotParseAiBlobValue: 101,
		InvalidContentBlob: 102,
		TrackPageActionEventFailed: 103,
	};
});
function Oi(t) {
	return Sr.toString.call(t);
}
function Hi(t, e) {
	return typeof t === e;
}
function pe(t) {
	return t === void 0 || typeof t === Oe;
}
function x(t) {
	return t === null || pe(t);
}
function ji(t) {
	return !x(t);
}
function Er(t, e) {
	return t && rr.call(t, e);
}
function st(t) {
	return typeof t === Xe;
}
function j(t) {
	return typeof t === mt;
}
function zt(t, e, r, n) {
	n === void 0 && (n = false);
	let i = false;
	if (!x(t)) {
		try {
			x(t[Po])
				? x(t[wo]) || (t[wo](Eo + e, r), (i = true))
				: (t[Po](e, r, n), (i = true));
		} catch (a) {}
	}
	return i;
}
function qn(t, e, r, n) {
	if ((n === void 0 && (n = false), !x(t))) {
		try {
			x(t[Do]) ? x(t[bo]) || t[bo](Eo + e, r) : t[Do](e, r, n);
		} catch (i) {}
	}
}
function zi(t) {
	let e = t,
		r = /([^\w\d_$])/g;
	return r.test(t) && (e = t.replace(r, '_')), e;
}
function Q(t, e) {
	if (t) {
		for (let r in t) {
			rr.call(t, r) && e.call(t, r, t[r]);
		}
	}
}
function Bi(t, e) {
	if (t && e) {
		let r = e.length,
			n = t.length;
		if (t === e) {
			return true;
		}
		if (n >= r) {
			for (let i = n - 1, a = r - 1; a >= 0; a--) {
				if (t[i] != e[a]) {
					return false;
				}
				i--;
			}
			return true;
		}
	}
	return false;
}
function Ee(t, e) {
	return t && e ? t.indexOf(e) !== -1 : false;
}
function wr(t) {
	return Oi(t) === '[object Date]';
}
function Re(t) {
	return Oi(t) === '[object Array]';
}
function Bt(t) {
	return Oi(t) === '[object Error]';
}
function _(t) {
	return typeof t === 'string';
}
function ir(t) {
	return typeof t === 'number';
}
function Gr(t) {
	return typeof t === 'boolean';
}
function Me(t) {
	if (wr(t)) {
		let e = function (r) {
			let n = String(r);
			return n.length === 1 && (n = '0' + n), n;
		};
		return (
			t.getUTCFullYear() +
			'-' +
			e(t.getUTCMonth() + 1) +
			'-' +
			e(t.getUTCDate()) +
			'T' +
			e(t.getUTCHours()) +
			':' +
			e(t.getUTCMinutes()) +
			':' +
			e(t.getUTCSeconds()) +
			'.' +
			String((t.getUTCMilliseconds() / 1e3).toFixed(3)).slice(2, 5) +
			'Z'
		);
	}
}
function R(t, e, r) {
	for (
		let n = t.length, i = 0;
		i < n && !(i in t && e.call(r || t, t[i], i, t) === -1);
		i++
	) {}
}
function Nt(t, e, r) {
	for (
		let n = t.length, i = r || 0, a = Math.max(i >= 0 ? i : n - Math.abs(i), 0);
		a < n;
		a++
	) {
		if (a in t && t[a] === e) {
			return a;
		}
	}
	return -1;
}
function Vt(t, e, r) {
	for (var n = t.length, i = r || t, a = new Array(n), o = 0; o < n; o++) {
		o in t && (a[o] = e.call(i, t[o], t));
	}
	return a;
}
function Kr(t, e, r) {
	let n = t.length,
		i = 0,
		a;
	if (arguments.length >= 3) {
		a = arguments[2];
	} else {
		for (; i < n && !(i in t); ) {
			i++;
		}
		a = t[i++];
	}
	for (; i < n; ) {
		i in t && (a = e(a, t[i], i, t)), i++;
	}
	return a;
}
function oe(t) {
	return typeof t !== 'string' ? t : t.replace(/^\s+|\s+$/g, '');
}
function Qe(t) {
	let e = typeof t;
	e !== mt && (e !== Xe || t === null) && Ir('objKeys called on non-object');
	let r = [];
	for (let n in t) {
		t && rr.call(t, n) && r.push(n);
	}
	if (Nu) {
		for (let i = Vi.length, a = 0; a < i; a++) {
			t && rr.call(t, Vi[a]) && r.push(Vi[a]);
		}
	}
	return r;
}
function St(t, e, r, n) {
	if (Ao) {
		try {
			let i = { enumerable: true, configurable: true };
			return r && (i.get = r), n && (i.set = n), Ao(t, e, i), true;
		} catch (a) {}
	}
	return false;
}
function de() {
	let t = Date;
	return t.now ? t.now() : new t().getTime();
}
function G(t) {
	return Bt(t) ? t.name : '';
}
function K(t, e, r, n, i) {
	let a = r;
	return (
		t &&
			((a = t[e]),
			a !== r && (!i || i(a)) && (!n || n(r)) && ((a = r), (t[e] = a))),
		a
	);
}
function ge(t, e, r) {
	let n;
	return (
		t
			? ((n = t[e]), !n && x(n) && ((n = pe(r) ? {} : r), (t[e] = n)))
			: (n = pe(r) ? {} : r),
		n
	);
}
function Gn(t) {
	return !t;
}
function Pr(t) {
	return !!t;
}
function Ae(t) {
	throw new Error(t);
}
function Wr(t, e, r) {
	if (t && e && t !== e && st(t) && st(e)) {
		let n = function (a) {
			if (_(a)) {
				let o = e[a];
				j(o)
					? (!r || r(a, true, e, t)) &&
					  (t[a] = (function (c) {
							return function () {
								let s = arguments;
								return e[c].apply(e, s);
							};
					  })(a))
					: (!r || r(a, false, e, t)) &&
					  (Er(t, a) && delete t[a],
					  St(
							t,
							a,
							function () {
								return e[a];
							},
							function (c) {
								e[a] = c;
							}
					  ) || (t[a] = o));
			}
		};
		for (let i in e) {
			n(i);
		}
	}
	return t;
}
function qi(t) {
	return (function () {
		function e() {
			let r = this;
			t &&
				Q(t, function (n, i) {
					r[n] = i;
				});
		}
		return e;
	})();
}
function Kn(t) {
	return t && (t = gt(Cr ? Cr({}, t) : t)), t;
}
let Eo;
let wo;
let Po;
let bo;
let Do;
let Ao;
let of;
let sf;
let Nu;
let Vi;
let Le = C(() => {
	ne();
	(Eo = 'on'),
		(wo = 'attachEvent'),
		(Po = 'addEventListener'),
		(bo = 'detachEvent'),
		(Do = 'removeEventListener'),
		(Ao = Un),
		(of = gt.freeze),
		(sf = gt.seal);
	(Nu = !{ toString: null }.propertyIsEnumerable('toString')),
		(Vi = [
			'toString',
			'toLocaleString',
			'valueOf',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'constructor',
		]);
});
function we(t) {
	let e = ot();
	return e && e[t] ? e[t] : t === No && ar() ? window : null;
}
function ar() {
	return Boolean(typeof window === Xe && window);
}
function Ct() {
	return ar() ? window : we(No);
}
function Wn() {
	return Boolean(typeof document === Xe && document);
}
function Ne() {
	return Wn() ? document : we(Fu);
}
function ko() {
	return Boolean(typeof navigator === Xe && navigator);
}
function Ue() {
	return ko() ? navigator : we(ku);
}
function Ro() {
	return Boolean(typeof history === Xe && history);
}
function Xi() {
	return Ro() ? history : we(Ru);
}
function et(t) {
	if (t && ju) {
		let e = we('__mockLocation');
		if (e) {
			return e;
		}
	}
	return typeof location === Xe && location ? location : we(Mu);
}
function Yi() {
	return typeof console !== Oe ? console : we(Lu);
}
function Ye() {
	return we(Uu);
}
function vt() {
	return Boolean((typeof JSON === Xe && JSON) || we(Fo) !== null);
}
function Pe() {
	return vt() ? JSON || we(Fo) : null;
}
function $i() {
	return we(_u);
}
function Zi() {
	return we(Ou);
}
function Qi() {
	let t = Ue();
	return t && t.product ? t.product === Hu : false;
}
function qt() {
	let t = Ue();
	if (t && (t.userAgent !== Ji || Wi === null)) {
		Ji = t.userAgent;
		let e = (Ji || '').toLowerCase();
		Wi = Ee(e, Gi) || Ee(e, Ki);
	}
	return Wi;
}
function or(t) {
	if ((t === void 0 && (t = null), !t)) {
		let e = Ue() || {};
		t = e ? (e.userAgent || '').toLowerCase() : '';
	}
	let r = (t || '').toLowerCase();
	if (Ee(r, Gi)) {
		return parseInt(r.split(Gi)[1]);
	}
	if (Ee(r, Ki)) {
		let n = parseInt(r.split(Ki)[1]);
		if (n) {
			return n + 4;
		}
	}
	return null;
}
function O(t) {
	let e = Object[Ie].toString.call(t),
		r = '';
	return (
		e === '[object Error]'
			? (r =
					"{ stack: '" +
					t.stack +
					"', message: '" +
					t.message +
					"', name: '" +
					t.name +
					"'")
			: vt() && (r = Pe().stringify(t)),
		e + r
	);
}
let No;
let Fu;
let ku;
let Ru;
let Mu;
let Lu;
let Uu;
let Fo;
let _u;
let Ou;
let Hu;
let Gi;
let Ki;
let Wi;
let Ji;
let ju;
let br = C(() => {
	ne();
	Le();
	('use strict');
	(No = 'window'),
		(Fu = 'document'),
		(ku = 'navigator'),
		(Ru = 'history'),
		(Mu = 'location'),
		(Lu = 'console'),
		(Uu = 'performance'),
		(Fo = 'JSON'),
		(_u = 'crypto'),
		(Ou = 'msCrypto'),
		(Hu = 'ReactNative'),
		(Gi = 'msie'),
		(Ki = 'trident/'),
		(Wi = null),
		(Ji = null),
		(ju = false);
});
function Mo(t) {
	return t ? '"' + t.replace(/\"/g, '') + '"' : '';
}
function kt(t, e) {
	return (t || {}).logger || new Jn(e);
}
let zu;
let Bu;
let Vu;
let Ft;
let Jn;
let Xn = C(() => {
	qr();
	br();
	Te();
	Le();
	('use strict');
	(zu = 'AI (Internal): '), (Bu = 'AI: '), (Vu = 'AITR_');
	Ft = (function () {
		function t(e, r, n, i) {
			n === void 0 && (n = false);
			let a = this;
			(a.messageId = e), (a.message = (n ? Bu : zu) + e);
			let o = '';
			vt() && (o = Pe().stringify(i));
			let c = (r ? ' message:' + Mo(r) : '') + (i ? ' props:' + Mo(o) : '');
			a.message += c;
		}
		return (t.dataType = 'MessageData'), t;
	})();
	Jn = (function () {
		function t(e) {
			(this.identifier = 'DiagnosticLogger'), (this.queue = []);
			let r = 0,
				n = {};
			W(t, this, function (i) {
				x(e) && (e = {}),
					(i.consoleLoggingLevel = function () {
						return a('loggingLevelConsole', 0);
					}),
					(i.telemetryLoggingLevel = function () {
						return a('loggingLevelTelemetry', 1);
					}),
					(i.maxInternalMessageLimit = function () {
						return a('maxMessageLimit', 25);
					}),
					(i.enableDebugExceptions = function () {
						return a('enableDebugExceptions', false);
					}),
					(i.throwInternal = function (c, s, u, l, f) {
						f === void 0 && (f = false);
						let m = new Ft(s, u, f, l);
						if (i.enableDebugExceptions()) {
							throw m;
						}
						if (!pe(m.message)) {
							let I = i.consoleLoggingLevel();
							if (f) {
								let E = +m.messageId;
								!n[E] &&
									I >= S.WARNING &&
									(i.warnToConsole(m.message), (n[E] = true));
							} else {
								I >= S.WARNING && i.warnToConsole(m.message);
							}
							i.logInternalMessage(c, m);
						}
					}),
					(i.warnToConsole = function (c) {
						let s = Yi();
						if (s) {
							let u = 'log';
							s.warn && (u = 'warn'), j(s[u]) && s[u](c);
						}
					}),
					(i.resetInternalMessageCount = function () {
						(r = 0), (n = {});
					}),
					(i.logInternalMessage = function (c, s) {
						if (!o()) {
							let u = true,
								l = Vu + s.messageId;
							if (
								(n[l] ? (u = false) : (n[l] = true),
								u &&
									(c <= i.telemetryLoggingLevel() && (i.queue.push(s), r++),
									r === i.maxInternalMessageLimit()))
							) {
								let f =
										'Internal events throttle limit per PageView reached for this app.',
									m = new Ft(h.MessageLimitPerPVExceeded, f, false);
								i.queue.push(m), i.warnToConsole(f);
							}
						}
					});
				function a(c, s) {
					let u = e[c];
					return x(u) ? s : u;
				}
				function o() {
					return r >= i.maxInternalMessageLimit();
				}
			});
		}
		return t;
	})();
});
function ct(t, e, r, n, i) {
	if (t) {
		let a = t;
		if ((j(a.getPerfMgr) && (a = a.getPerfMgr()), a)) {
			let o = void 0,
				c = a.getCtx(ea);
			try {
				if (((o = a.create(e(), n, i)), o)) {
					if (
						c &&
						o.setCtx &&
						(o.setCtx(sr.ParentContextKey, c), c.getCtx && c.setCtx)
					) {
						let s = c.getCtx(sr.ChildrenContextKey);
						s || ((s = []), c.setCtx(sr.ChildrenContextKey, s)), s.push(o);
					}
					return a.setCtx(ea, o), r(o);
				}
			} catch (u) {
				o && o.setCtx && o.setCtx('exception', u);
			} finally {
				o && a.fire(o), a.setCtx(ea, c);
			}
		}
	}
	return r();
}
let Dr;
let sr;
let Jr;
let ea;
let Xr = C(() => {
	Te();
	Le();
	(Dr = 'ctx'),
		(sr = (function () {
			function t(e, r, n) {
				let i = this,
					a = false;
				if (
					((i.start = de()),
					(i.name = e),
					(i.isAsync = n),
					(i.isChildEvt = function () {
						return false;
					}),
					j(r))
				) {
					let o;
					a = St(i, 'payload', function () {
						return !o && j(r) && ((o = r()), (r = null)), o;
					});
				}
				(i.getCtx = function (c) {
					return c
						? c === t.ParentContextKey || c === t.ChildrenContextKey
							? i[c]
							: (i[Dr] || {})[c]
						: null;
				}),
					(i.setCtx = function (c, s) {
						if (c) {
							if (c === t.ParentContextKey) {
								i[c] ||
									(i.isChildEvt = function () {
										return true;
									}),
									(i[c] = s);
							} else if (c === t.ChildrenContextKey) {
								i[c] = s;
							} else {
								let u = (i[Dr] = i[Dr] || {});
								u[c] = s;
							}
						}
					}),
					(i.complete = function () {
						let c = 0,
							s = i.getCtx(t.ChildrenContextKey);
						if (Re(s)) {
							for (let u = 0; u < s.length; u++) {
								let l = s[u];
								l && (c += l.time);
							}
						}
						(i.time = de() - i.start),
							(i.exTime = i.time - c),
							(i.complete = function () {}),
							!a && j(r) && (i.payload = r());
					});
			}
			return (
				(t.ParentContextKey = 'parent'), (t.ChildrenContextKey = 'childEvts'), t
			);
		})()),
		(Jr = (function () {
			function t(e) {
				(this.ctx = {}),
					W(t, this, function (r) {
						(r.create = function (n, i, a) {
							return new sr(n, i, a);
						}),
							(r.fire = function (n) {
								n && (n.complete(), e && e.perfEvent(n));
							}),
							(r.setCtx = function (n, i) {
								if (n) {
									let a = (r[Dr] = r[Dr] || {});
									a[n] = i;
								}
							}),
							(r.getCtx = function (n) {
								return (r[Dr] || {})[n];
							});
					});
			}
			return t;
		})()),
		(ea = 'CoreUtils.doPerf');
});
let Lo;
let Uo = C(() => {
	Xr();
	qr();
	Le();
	('use strict');
	Lo = (function () {
		function t(e, r) {
			let n = this,
				i = null,
				a = j(e.processTelemetry),
				o = j(e.setNextPlugin);
			(n._hasRun = false),
				(n.getPlugin = function () {
					return e;
				}),
				(n.getNext = function () {
					return i;
				}),
				(n.setNext = function (c) {
					i = c;
				}),
				(n.processTelemetry = function (c, s) {
					s || (s = r);
					let u = e ? e.identifier : 'TelemetryPluginChain';
					ct(
						s ? s.core() : null,
						function () {
							return u + ':processTelemetry';
						},
						function () {
							if (e && a) {
								n._hasRun = true;
								try {
									s.setNext(i),
										o && e.setNextPlugin(i),
										i && (i._hasRun = false),
										e.processTelemetry(c, s);
								} catch (f) {
									let l = i && i._hasRun;
									(!i || !l) &&
										s
											.diagLog()
											.throwInternal(
												S.CRITICAL,
												h.PluginException,
												'Plugin [' +
													e.identifier +
													'] failed during processTelemetry - ' +
													f
											),
										i && !l && i.processTelemetry(c, s);
								}
							} else {
								i && ((n._hasRun = true), i.processTelemetry(c, s));
							}
						},
						function () {
							return { item: c };
						},
						!c.sync
					);
				});
		}
		return t;
	})();
});
function ta(t, e) {
	let r = [];
	if (t && t.length > 0) {
		for (let n = null, i = 0; i < t.length; i++) {
			let a = t[i];
			if (a && j(a.processTelemetry)) {
				let o = new Lo(a, e);
				r.push(o), n && n.setNext(o), (n = o);
			}
		}
	}
	return r.length > 0 ? r[0] : null;
}
function qu(t, e, r) {
	let n = [],
		i = !r;
	if (t) {
		for (; t; ) {
			let a = t.getPlugin();
			(i || a === r) && ((i = true), n.push(a)), (t = t.getNext());
		}
	}
	return i || n.push(r), ta(n, e);
}
function Gu(t, e, r) {
	let n = t,
		i = false;
	return (
		r &&
			t &&
			((n = []),
			R(t, function (a) {
				(i || a === r) && ((i = true), n.push(a));
			})),
		r && !i && (n || (n = []), n.push(r)),
		ta(n, e)
	);
}
let Rt;
let Yn = C(() => {
	Xn();
	Uo();
	Le();
	('use strict');
	Rt = (function () {
		function t(e, r, n, i) {
			let a = this,
				o = null;
			i !== null &&
				(e && j(e.getPlugin)
					? (o = qu(e, a, i || e.getPlugin()))
					: i
					? (o = Gu(e, a, i))
					: pe(i) && (o = ta(e, a))),
				(a.core = function () {
					return n;
				}),
				(a.diagLog = function () {
					return kt(n, r);
				}),
				(a.getCfg = function () {
					return r;
				}),
				(a.getExtCfg = function (c, s) {
					s === void 0 && (s = {});
					let u;
					if (r) {
						let l = r.extensionConfig;
						l && c && (u = l[c]);
					}
					return u || s;
				}),
				(a.getConfig = function (c, s, u) {
					u === void 0 && (u = false);
					let l,
						f = a.getExtCfg(c, null);
					return (
						f && !x(f[s]) ? (l = f[s]) : r && !x(r[s]) && (l = r[s]),
						x(l) ? u : l
					);
				}),
				(a.hasNext = function () {
					return o != null;
				}),
				(a.getNext = function () {
					return o;
				}),
				(a.setNext = function (c) {
					o = c;
				}),
				(a.processNext = function (c) {
					let s = o;
					s && ((o = s.getNext()), s.processTelemetry(c, a));
				}),
				(a.createNew = function (c, s) {
					return c === void 0 && (c = null), new t(c || o, r, n, s);
				});
		}
		return t;
	})();
});
let _o;
let $n;
let ra = C(() => {
	(_o = 'iKey'), ($n = 'extensionConfig');
});
let Zn;
let tt;
let na = C(() => {
	Yn();
	Le();
	ra();
	('use strict');
	(Zn = 'getPlugin'),
		(tt = (function () {
			function t() {
				let e = this,
					r = false,
					n = null,
					i = null;
				(e.core = null),
					(e.diagLog = function (a) {
						return e._getTelCtx(a).diagLog();
					}),
					(e.isInitialized = function () {
						return r;
					}),
					(e.setInitialized = function (a) {
						r = a;
					}),
					(e.setNextPlugin = function (a) {
						i = a;
					}),
					(e.processNext = function (a, o) {
						o
							? o.processNext(a)
							: i && j(i.processTelemetry) && i.processTelemetry(a, null);
					}),
					(e._getTelCtx = function (a) {
						a === void 0 && (a = null);
						let o = a;
						if (!o) {
							let c = n || new Rt(null, {}, e.core);
							i && i[Zn]
								? (o = c.createNew(null, i[Zn]))
								: (o = c.createNew(null, i));
						}
						return o;
					}),
					(e._baseTelInit = function (a, o, c, s) {
						a && K(a, $n, [], null, x),
							!s && o && (s = o.getProcessTelContext().getNext());
						let u = i;
						i && i[Zn] && (u = i[Zn]()),
							(e.core = o),
							(n = new Rt(s, a, o, u)),
							(r = true);
					});
			}
			return (
				(t.prototype.initialize = function (e, r, n, i) {
					this._baseTelInit(e, r, n, i);
				}),
				t
			);
		})());
});
function Yr(t, e) {
	for (var r = [], n = null, i = t.getNext(); i; ) {
		let a = i.getPlugin();
		a &&
			(n && j(n[Ho]) && j(a[ia]) && n[Ho](a),
			(!j(a[jo]) || !a[jo]()) && r.push(a),
			(n = a),
			(i = i.getNext()));
	}
	R(r, function (o) {
		o.initialize(t.getCfg(), t.core(), e, t.getNext());
	});
}
function aa(t) {
	return t.sort(function (e, r) {
		let n = 0,
			i = j(r[ia]);
		return j(e[ia]) ? (n = i ? e[Oo] - r[Oo] : 1) : i && (n = -1), n;
	});
}
let ia;
let Oo;
let Ho;
let jo;
let oa = C(() => {
	Le();
	('use strict');
	(ia = 'processTelemetry'),
		(Oo = 'priority'),
		(Ho = 'setNextPlugin'),
		(jo = 'isInitialized');
});
let sa;
let Ku;
let zo;
let Bo = C(() => {
	ne();
	Te();
	na();
	Yn();
	oa();
	Le();
	('use strict');
	(sa = 500),
		(Ku = 'Channel has invalid priority'),
		(zo = (function (t) {
			H(e, t);
			function e() {
				let r = t.call(this) || this;
				(r.identifier = 'ChannelControllerPlugin'), (r.priority = sa);
				let n;
				W(e, r, function (c, s) {
					(c.setNextPlugin = function (u) {}),
						(c.processTelemetry = function (u, l) {
							n &&
								R(n, function (f) {
									if (f.length > 0) {
										let m = r._getTelCtx(l).createNew(f);
										m.processNext(u);
									}
								});
						}),
						(c.getChannelControls = function () {
							return n;
						}),
						(c.initialize = function (u, l, f) {
							c.isInitialized() ||
								(s.initialize(u, l, f),
								o((u || {}).channels, f),
								R(n, function (m) {
									return Yr(new Rt(m, u, l), f);
								}));
						});
				});
				function i(c) {
					R(c, function (s) {
						s.priority < sa && Ae(Ku + s.identifier);
					});
				}
				function a(c) {
					c &&
						c.length > 0 &&
						((c = c.sort(function (s, u) {
							return s.priority - u.priority;
						})),
						i(c),
						n.push(c));
				}
				function o(c, s) {
					if (
						((n = []),
						c &&
							R(c, function (l) {
								return a(l);
							}),
						s)
					) {
						let u = [];
						R(s, function (l) {
							l.priority > sa && u.push(l);
						}),
							a(u);
					}
				}
				return r;
			}
			return (
				(e._staticInit = (function () {
					let r = e.prototype;
					St(r, 'ChannelControls', r.getChannelControls),
						St(r, 'channelQueue', r.getChannelControls);
				})()),
				e
			);
		})(tt));
});
function pa(t, e) {
	let r = ur[Gt] || ei[Gt];
	return r || ((r = ur[Gt] = ur(t, e)), (ei[Gt] = r)), r;
}
function ti(t) {
	return t ? t.isEnabled() : true;
}
function Wu(t) {
	let e = (t.cookieCfg = t.cookieCfg || {});
	if (
		(K(e, 'domain', t.cookieDomain, ji, x),
		K(e, 'path', t.cookiePath || '/', null, x),
		x(e[la]))
	) {
		let r = void 0;
		pe(t[Go]) || (r = !t[Go]), pe(t[Ko]) || (r = !t[Ko]), (e[la] = r);
	}
	return e;
}
function cr(t, e) {
	let r;
	if (t) {
		r = t.getCookieMgr();
	} else if (e) {
		let n = e.cookieCfg;
		n[Gt] ? (r = n[Gt]) : (r = ur(e));
	}
	return r || (r = pa(e, (t || {}).logger)), r;
}
function ur(t, e) {
	var r = Wu(t || ei),
		n = r.path || '/',
		i = r.domain,
		a = r[la] !== false,
		o = {
			isEnabled: function () {
				let c = a && da(e),
					s = ei[Gt];
				return c && s && o !== s && (c = ti(s)), c;
			},
			setEnabled: function (c) {
				a = c !== false;
			},
			set: function (c, s, u, l, f) {
				if (ti(o)) {
					let m = {},
						I = oe(s || ht),
						E = I.indexOf(';');
					if (
						(E !== -1 &&
							((I = oe(s.substring(0, E))), (m = Xo(s.substring(E + 1)))),
						K(m, 'domain', l || i, Pr, pe),
						!x(u))
					) {
						let b = qt();
						if (pe(m[ua])) {
							let p = de(),
								v = p + u * 1e3;
							if (v > 0) {
								let y = new Date();
								y.setTime(v),
									K(m, ua, Yo(y, b ? Vo : qo) || Yo(y, b ? Vo : qo) || ht, Pr);
							}
						}
						b || K(m, 'max-age', ht + u, null, pe);
					}
					let w = et();
					w &&
						w.protocol === 'https:' &&
						(K(m, 'secure', null, null, pe),
						fa === null && (fa = !ri((Ue() || {}).userAgent)),
						fa && K(m, 'SameSite', 'None', null, pe)),
						K(m, 'path', f || n, null, pe);
					let L = r.setCookie || Zo;
					L(c, $o(I, m));
				}
			},
			get: function (c) {
				let s = ht;
				return ti(o) && (s = (r.getCookie || Ju)(c)), s;
			},
			del: function (c, s) {
				ti(o) && o.purge(c, s);
			},
			purge: function (c, s) {
				if (da(e)) {
					let u =
						((f = {}),
						(f.path = s || '/'),
						(f[ua] = 'Thu, 01 Jan 1970 00:00:01 GMT'),
						f);
					qt() || (u['max-age'] = '0');
					let l = r.delCookie || Zo;
					l(c, $o(ht, u));
				}
				let f;
			},
		};
	return (o[Gt] = o), o;
}
function da(t) {
	if (Qn === null) {
		Qn = false;
		try {
			let e = $r || {};
			Qn = e[ca] !== void 0;
		} catch (r) {
			t &&
				t.throwInternal(
					S.WARNING,
					h.CannotAccessCookie,
					'Cannot access document.cookie - ' + G(r),
					{ exception: O(r) }
				);
		}
	}
	return Qn;
}
function Xo(t) {
	let e = {};
	if (t && t.length) {
		let r = oe(t).split(';');
		R(r, function (n) {
			if (((n = oe(n || ht)), n)) {
				let i = n.indexOf('=');
				i === -1
					? (e[n] = null)
					: (e[oe(n.substring(0, i))] = oe(n.substring(i + 1)));
			}
		});
	}
	return e;
}
function Yo(t, e) {
	return j(t[e]) ? t[e]() : null;
}
function $o(t, e) {
	let r = t || ht;
	return (
		Q(e, function (n, i) {
			r += '; ' + n + (x(i) ? ht : '=' + i);
		}),
		r
	);
}
function Ju(t) {
	let e = ht;
	if ($r) {
		let r = $r[ca] || ht;
		Wo !== r && ((Jo = Xo(r)), (Wo = r)), (e = oe(Jo[t] || ht));
	}
	return e;
}
function Zo(t, e) {
	$r && ($r[ca] = t + '=' + e);
}
function ri(t) {
	return _(t)
		? !!(
				Ee(t, 'CPU iPhone OS 12') ||
				Ee(t, 'iPad; CPU OS 12') ||
				(Ee(t, 'Macintosh; Intel Mac OS X 10_14') &&
					Ee(t, 'Version/') &&
					Ee(t, 'Safari')) ||
				(Ee(t, 'Macintosh; Intel Mac OS X 10_14') &&
					Bi(t, 'AppleWebKit/605.1.15 (KHTML, like Gecko)')) ||
				Ee(t, 'Chrome/5') ||
				Ee(t, 'Chrome/6') ||
				(Ee(t, 'UnrealEngine') && !Ee(t, 'Chrome')) ||
				Ee(t, 'UCBrowser/12') ||
				Ee(t, 'UCBrowser/11')
		  )
		: false;
}
let Vo;
let qo;
let ca;
let ua;
let la;
let Go;
let Ko;
let Gt;
let ht;
let Qn;
let fa;
let Wo;
let $r;
let Jo;
let ei;
let ni = C(() => {
	qr();
	br();
	Le();
	(Vo = 'toGMTString'),
		(qo = 'toUTCString'),
		(ca = 'cookie'),
		(ua = 'expires'),
		(la = 'enabled'),
		(Go = 'isCookieUseDisabled'),
		(Ko = 'disableCookiesUsage'),
		(Gt = '_ckMgr'),
		(ht = ''),
		(Qn = null),
		(fa = null),
		(Wo = null),
		($r = Ne()),
		(Jo = {}),
		(ei = {});
});
let Xu;
let Qo;
let Zr;
let ma = C(() => {
	ne();
	Te();
	Bo();
	Yn();
	oa();
	Xr();
	ni();
	Le();
	ra();
	('use strict');
	(Xu = 'Extensions must provide callback to initialize'),
		(Qo = '_notificationManager'),
		(Zr = (function () {
			function t() {
				let e = false,
					r,
					n,
					i,
					a,
					o;
				W(t, this, function (c) {
					(c._extensions = new Array()),
						(n = new zo()),
						(c.logger = Dt({
							throwInternal: function (s, u, l, f, m) {
								m === void 0 && (m = false);
							},
							warnToConsole: function (s) {},
							resetInternalMessageCount: function () {},
						})),
						(r = []),
						(c.isInitialized = function () {
							return e;
						}),
						(c.initialize = function (s, u, l, f) {
							c.isInitialized() &&
								Ae('Core should not be initialized more than once'),
								(!s || x(s.instrumentationKey)) &&
									Ae('Please provide instrumentation key'),
								(i = f),
								(c[Qo] = f),
								(c.config = s || {}),
								(s.extensions = x(s.extensions) ? [] : s.extensions);
							let m = ge(s, $n);
							(m.NotificationManager = f), l && (c.logger = l);
							let I = [];
							I.push.apply(I, u.concat(s.extensions)), (I = aa(I));
							let E = [],
								b = [],
								p = {};
							R(I, function (v) {
								(x(v) || x(v.initialize)) && Ae(Xu);
								let y = v.priority,
									w = v.identifier;
								v &&
									y &&
									(x(p[y])
										? (p[y] = w)
										: l.warnToConsole(
												'Two extensions have same priority #' +
													y +
													' - ' +
													p[y] +
													', ' +
													w
										  )),
									!y || y < n.priority ? E.push(v) : b.push(v);
							}),
								I.push(n),
								E.push(n),
								(I = aa(I)),
								(c._extensions = I),
								Yr(new Rt([n], s, c), I),
								Yr(new Rt(E, s, c), I),
								(c._extensions = E),
								c.getTransmissionControls().length === 0 &&
									Ae('No channels available'),
								(e = true),
								c.releaseQueue();
						}),
						(c.getTransmissionControls = function () {
							return n.getChannelControls();
						}),
						(c.track = function (s) {
							K(s, _o, c.config.instrumentationKey, null, Gn),
								K(s, 'time', Me(new Date()), null, Gn),
								K(s, 'ver', '4.0', null, x),
								c.isInitialized()
									? c.getProcessTelContext().processNext(s)
									: r.push(s);
						}),
						(c.getProcessTelContext = function () {
							let s = c._extensions,
								u = s;
							return (
								(!s || s.length === 0) && (u = [n]), new Rt(u, c.config, c)
							);
						}),
						(c.getNotifyMgr = function () {
							return (
								i ||
									((i = Dt({
										addNotificationListener: function (s) {},
										removeNotificationListener: function (s) {},
										eventsSent: function (s) {},
										eventsDiscarded: function (s, u) {},
										eventsSendRequest: function (s, u) {},
									})),
									(c[Qo] = i)),
								i
							);
						}),
						(c.getCookieMgr = function () {
							return o || (o = ur(c.config, c.logger)), o;
						}),
						(c.setCookieMgr = function (s) {
							o = s;
						}),
						(c.getPerfMgr = function () {
							return (
								a ||
									(c.config &&
										c.config.enablePerfMgr &&
										(a = new Jr(c.getNotifyMgr()))),
								a
							);
						}),
						(c.setPerfMgr = function (s) {
							a = s;
						}),
						(c.eventCnt = function () {
							return r.length;
						}),
						(c.releaseQueue = function () {
							r.length > 0 &&
								(R(r, function (s) {
									c.getProcessTelContext().processNext(s);
								}),
								(r = []));
						});
				});
			}
			return t;
		})());
});
let Qr;
let ga = C(() => {
	Te();
	Le();
	Qr = (function () {
		function t(e) {
			this.listeners = [];
			let r = !!(e || {}).perfEvtsSendAll;
			W(t, this, function (n) {
				(n.addNotificationListener = function (i) {
					n.listeners.push(i);
				}),
					(n.removeNotificationListener = function (i) {
						for (let a = Nt(n.listeners, i); a > -1; ) {
							n.listeners.splice(a, 1), (a = Nt(n.listeners, i));
						}
					}),
					(n.eventsSent = function (i) {
						R(n.listeners, function (a) {
							a &&
								a.eventsSent &&
								setTimeout(function () {
									return a.eventsSent(i);
								}, 0);
						});
					}),
					(n.eventsDiscarded = function (i, a) {
						R(n.listeners, function (o) {
							o &&
								o.eventsDiscarded &&
								setTimeout(function () {
									return o.eventsDiscarded(i, a);
								}, 0);
						});
					}),
					(n.eventsSendRequest = function (i, a) {
						R(n.listeners, function (o) {
							if (o && o.eventsSendRequest) {
								if (a) {
									setTimeout(function () {
										return o.eventsSendRequest(i, a);
									}, 0);
								} else {
									try {
										o.eventsSendRequest(i, a);
									} catch (c) {}
								}
							}
						});
					}),
					(n.perfEvent = function (i) {
						i &&
							(r || !i.isChildEvt()) &&
							R(n.listeners, function (a) {
								if (a && a.perfEvent) {
									if (i.isAsync) {
										setTimeout(function () {
											return a.perfEvent(i);
										}, 0);
									} else {
										try {
											a.perfEvent(i);
										} catch (o) {}
									}
								}
							});
					});
			});
		}
		return t;
	})();
});
let en;
let es = C(() => {
	ne();
	ma();
	vo();
	ga();
	Xr();
	Xn();
	Te();
	Le();
	en = (function (t) {
		H(e, t);
		function e() {
			let r = t.call(this) || this;
			return (
				W(e, r, function (n, i) {
					(n.initialize = function (c, s, u, l) {
						i.initialize(c, s, u || new Jn(c), l || new Qr(c));
					}),
						(n.track = function (c) {
							ct(
								n.getPerfMgr(),
								function () {
									return 'AppInsightsCore:track';
								},
								function () {
									c === null && (o(c), Ae('Invalid telemetry item')),
										a(c),
										i.track(c);
								},
								function () {
									return { item: c };
								},
								!c.sync
							);
						}),
						(n.addNotificationListener = function (c) {
							let s = n.getNotifyMgr();
							s && s.addNotificationListener(c);
						}),
						(n.removeNotificationListener = function (c) {
							let s = n.getNotifyMgr();
							s && s.removeNotificationListener(c);
						}),
						(n.pollInternalLogs = function (c) {
							let s = n.config.diagnosticLogInterval;
							return (
								(!s || !(s > 0)) && (s = 1e4),
								setInterval(function () {
									let u = n.logger ? n.logger.queue : [];
									R(u, function (l) {
										let f = {
											name: c || 'InternalMessageId: ' + l.messageId,
											iKey: n.config.instrumentationKey,
											time: Me(new Date()),
											baseType: Ft.dataType,
											baseData: { message: l.message },
										};
										n.track(f);
									}),
										(u.length = 0);
								}, s)
							);
						});
					function a(c) {
						if (x(c.name)) {
							throw (o(c), Error('telemetry name required'));
						}
					}
					function o(c) {
						let s = n.getNotifyMgr();
						s && s.eventsDiscarded([c], go.InvalidEvent);
					}
				}),
				r
			);
		}
		return e;
	})(Zr);
});
function ns(t) {
	t < 0 && (t >>>= 0),
		(tn = (123456789 + t) & Kt),
		(rn = (987654321 - t) & Kt),
		(rs = true);
}
function is() {
	try {
		let t = de() & 2147483647;
		ns(((Math.random() * ts) ^ t) + t);
	} catch (e) {}
}
function ii(t) {
	return t > 0 ? Math.floor((It() / Kt) * (t + 1)) >>> 0 : 0;
}
function It(t) {
	let e,
		r = $i() || Zi();
	return (
		r && r.getRandomValues
			? (e = r.getRandomValues(new Uint32Array(1))[0] & Kt)
			: qt()
			? (rs || is(), (e = ai() & Kt))
			: (e = Math.floor((ts * Math.random()) | 0)),
		t || (e >>>= 0),
		e
	);
}
function va(t) {
	t ? ns(t) : is();
}
function ai(t) {
	(rn = (36969 * (rn & 65535) + (rn >> 16)) & Kt),
		(tn = (18e3 * (tn & 65535) + (tn >> 16)) & Kt);
	let e = ((((rn << 16) + (tn & 65535)) >>> 0) & Kt) | 0;
	return t || (e >>>= 0), e;
}
let ts;
let Kt;
let rs;
let tn;
let rn;
let ha = C(() => {
	br();
	Le();
	(ts = 4294967296),
		(Kt = 4294967295),
		(rs = false),
		(tn = 123456789),
		(rn = 987654321);
});
function Mt(t, e) {
	let r = false,
		n = Ct();
	n && ((r = zt(n, t, e)), (r = zt(n.body, t, e) || r));
	let i = Ne();
	return i && (r = Jt.Attach(i, t, e) || r), r;
}
function as() {
	function t() {
		return ii(15);
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(Yu, function (e) {
		let r = t() | 0,
			n = e === 'x' ? r : (r & 3) | 8;
		return n.toString(16);
	});
}
function os() {
	let t = Ye();
	return t && t.now ? t.now() : de();
}
function Wt(t) {
	t === void 0 && (t = 22);
	for (
		var e = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
			r = It() >>> 0,
			n = 0,
			i = '';
		i.length < t;

	) {
		n++,
			(i += e.charAt(r & 63)),
			(r >>>= 6),
			n === 5 && ((r = (((It() << 2) & 4294967295) | (r & 3)) >>> 0), (n = 0));
	}
	return i;
}
function He() {
	for (
		var t = [
				'0',
				'1',
				'2',
				'3',
				'4',
				'5',
				'6',
				'7',
				'8',
				'9',
				'a',
				'b',
				'c',
				'd',
				'e',
				'f',
			],
			e = '',
			r,
			n = 0;
		n < 4;
		n++
	) {
		(r = It()),
			(e +=
				t[r & 15] +
				t[(r >> 4) & 15] +
				t[(r >> 8) & 15] +
				t[(r >> 12) & 15] +
				t[(r >> 16) & 15] +
				t[(r >> 20) & 15] +
				t[(r >> 24) & 15] +
				t[(r >> 28) & 15]);
	}
	let i = t[(8 + (It() & 3)) | 0];
	return (
		e.substr(0, 8) +
		e.substr(9, 4) +
		'4' +
		e.substr(13, 3) +
		i +
		e.substr(16, 3) +
		e.substr(19, 12)
	);
}
function Xt(t, e) {
	let r = pa(t, e),
		n = on._canUseCookies;
	return (
		nn === null &&
			((nn = []),
			(an = n),
			St(
				on,
				'_canUseCookies',
				function () {
					return an;
				},
				function (i) {
					(an = i),
						R(nn, function (a) {
							a.setEnabled(i);
						});
				}
			)),
		Nt(nn, r) === -1 && nn.push(r),
		Gr(n) && r.setEnabled(n),
		Gr(an) && r.setEnabled(an),
		r
	);
}
function oi() {
	Xt().setEnabled(false);
}
function xa(t) {
	return Xt(null, t).isEnabled();
}
function ya(t, e) {
	return Xt(null, t).get(e);
}
function Sa(t, e, r, n) {
	Xt(null, t).set(e, r, null, n);
}
function Ca(t, e) {
	return Xt(null, t).del(e);
}
let nn;
let an;
let on;
let Yu;
let Jt;
let ss = C(() => {
	ne();
	ni();
	br();
	Le();
	ha();
	('use strict');
	nn = null;
	(on = {
		_canUseCookies: void 0,
		isTypeof: Hi,
		isUndefined: pe,
		isNullOrUndefined: x,
		hasOwnProperty: Er,
		isFunction: j,
		isObject: st,
		isDate: wr,
		isArray: Re,
		isError: Bt,
		isString: _,
		isNumber: ir,
		isBoolean: Gr,
		toISOString: Me,
		arrForEach: R,
		arrIndexOf: Nt,
		arrMap: Vt,
		arrReduce: Kr,
		strTrim: oe,
		objCreate: Dt,
		objKeys: Qe,
		objDefineAccessors: St,
		addEventHandler: Mt,
		dateNow: de,
		isIE: qt,
		disableCookies: oi,
		newGuid: as,
		perfNow: os,
		newId: Wt,
		randomValue: ii,
		random32: It,
		mwcRandomSeed: va,
		mwcRandom32: ai,
		generateW3CId: He,
	}),
		(Yu = /[xy]/g),
		(Jt = { Attach: zt, AttachEvent: zt, Detach: qn, DetachEvent: qn });
});
function Ia(t, e) {
	if (t) {
		for (let r = 0; r < t.length && !e(t[r], r); r++) {}
	}
}
function Ta(t, e, r, n, i) {
	i >= 0 &&
		i <= 2 &&
		Ia(t, function (a, o) {
			let c = a.cbks,
				s = c[us[i]];
			if (s) {
				e.ctx = function () {
					let f = (n[o] = n[o] || {});
					return f;
				};
				try {
					s.apply(e.inst, r);
				} catch (f) {
					let u = e.err;
					try {
						let l = c[us[2]];
						l && ((e.err = f), l.apply(e.inst, r));
					} catch (m) {
					} finally {
						e.err = u;
					}
				}
			}
		});
}
function Qu(t) {
	return function () {
		let e = this,
			r = arguments,
			n = t.h,
			i = { name: t.n, inst: e, ctx: null, set: s },
			a = [],
			o = c([i], r);
		function c(l, f) {
			return (
				Ia(f, function (m) {
					l.push(m);
				}),
				l
			);
		}
		function s(l, f) {
			(r = c([], r)), (r[l] = f), (o = c([i], r));
		}
		Ta(n, i, o, a, 0);
		let u = t.f;
		try {
			i.rslt = u.apply(e, r);
		} catch (l) {
			throw ((i.err = l), Ta(n, i, o, a, 3), l);
		}
		return Ta(n, i, o, a, 1), i.rslt;
	};
}
function el(t) {
	if (t) {
		if (ls) {
			return ls(t);
		}
		let e = t[$u] || t[Ie] || t[Zu];
		if (e) {
			return e;
		}
	}
	return null;
}
function fs(t, e, r) {
	let n = null;
	return t && (Er(t, e) ? (n = t) : r && (n = fs(el(t), e, false))), n;
}
function Ea(t, e, r) {
	return t ? sn(t[Ie], e, r, false) : null;
}
function sn(t, e, r, n) {
	if ((n === void 0 && (n = true), t && e && r)) {
		let i = fs(t, e, n);
		if (i) {
			let a = i[e];
			if (typeof a === mt) {
				let o = a[cs];
				if (!o) {
					o = { i: 0, n: e, f: a, h: [] };
					let c = Qu(o);
					(c[cs] = o), (i[e] = c);
				}
				let s = {
					id: o.i,
					cbks: r,
					rm: function () {
						let u = this.id;
						Ia(o.h, function (l, f) {
							if (l.id === u) {
								return o.h.splice(f, 1), 1;
							}
						});
					},
				};
				return o.i++, o.h.push(s), s;
			}
		}
	}
	return null;
}
let cs;
let us;
let $u;
let Zu;
let ls;
let ps = C(() => {
	ne();
	Le();
	(cs = '_aiHooks'),
		(us = ['req', 'rsp', 'hkErr', 'fnErr']),
		($u = '__proto__'),
		(Zu = 'constructor');
	ls = Object.getPrototypeOf;
});
let J = C(() => {
	es();
	ma();
	na();
	ha();
	ss();
	Le();
	br();
	ne();
	ga();
	Xr();
	Xn();
	qr();
	ps();
	ni();
});
let te;
let wa = C(() => {
	te = {
		requestContextHeader: 'Request-Context',
		requestContextTargetKey: 'appId',
		requestContextAppIdFormat: 'appId=cid-v1:',
		requestIdHeader: 'Request-Id',
		traceParentHeader: 'traceparent',
		traceStateHeader: 'tracestate',
		sdkContextHeader: 'Sdk-Context',
		sdkContextHeaderAppIdRequest: 'appId',
		requestContextHeaderLowerCase: 'request-context',
	};
});
function si(t, e, r) {
	let n = e.length,
		i = Pa(t, e);
	if (i.length !== n) {
		for (var a = 0, o = i; r[o] !== void 0; ) {
			a++, (o = i.substring(0, 150 - 3) + ba(a));
		}
		i = o;
	}
	return i;
}
function Pa(t, e) {
	let r;
	return (
		e &&
			((e = oe(e.toString())),
			e.length > 150 &&
				((r = e.substring(0, 150)),
				t.throwInternal(
					S.WARNING,
					h.NameTooLong,
					'name is too long.  It has been truncated to ' + 150 + ' characters.',
					{ name: e },
					true
				))),
		r || e
	);
}
function ae(t, e, r) {
	r === void 0 && (r = 1024);
	let n;
	return (
		e &&
			((r = r || 1024),
			(e = oe(e)),
			e.toString().length > r &&
				((n = e.toString().substring(0, r)),
				t.throwInternal(
					S.WARNING,
					h.StringValueTooLong,
					'string value is too long. It has been truncated to ' +
						r +
						' characters.',
					{ value: e },
					true
				))),
		n || e
	);
}
function Tt(t, e) {
	return li(t, e, 2048, h.UrlTooLong);
}
function Ar(t, e) {
	let r;
	return (
		e &&
			e.length > 32768 &&
			((r = e.substring(0, 32768)),
			t.throwInternal(
				S.WARNING,
				h.MessageTruncated,
				'message is too long, it has been truncated to ' +
					32768 +
					' characters.',
				{ message: e },
				true
			)),
		r || e
	);
}
function ci(t, e) {
	let r;
	if (e) {
		let n = '' + e;
		n.length > 32768 &&
			((r = n.substring(0, 32768)),
			t.throwInternal(
				S.WARNING,
				h.ExceptionTruncated,
				'exception is too long, it has been truncated to ' +
					32768 +
					' characters.',
				{ exception: e },
				true
			));
	}
	return r || e;
}
function je(t, e) {
	if (e) {
		let r = {};
		Q(e, function (n, i) {
			if (st(i) && vt()) {
				try {
					i = Pe().stringify(i);
				} catch (a) {
					t.throwInternal(
						S.WARNING,
						h.CannotSerializeObjectNonSerializable,
						'custom property is not valid',
						{ exception: a },
						true
					);
				}
			}
			(i = ae(t, i, 8192)), (n = si(t, n, r)), (r[n] = i);
		}),
			(e = r);
	}
	return e;
}
function ze(t, e) {
	if (e) {
		let r = {};
		Q(e, function (n, i) {
			(n = si(t, n, r)), (r[n] = i);
		}),
			(e = r);
	}
	return e;
}
function ui(t, e) {
	return e && li(t, e, 128, h.IdTooLong).toString();
}
function li(t, e, r, n) {
	let i;
	return (
		e &&
			((e = oe(e)),
			e.length > r &&
				((i = e.substring(0, r)),
				t.throwInternal(
					S.WARNING,
					n,
					'input is too long, it has been truncated to ' + r + ' characters.',
					{ data: e },
					true
				))),
		i || e
	);
}
function ba(t) {
	let e = '00' + t;
	return e.substr(e.length - 3);
}
let Da;
let ut = C(() => {
	J();
	Da = {
		MAX_NAME_LENGTH: 150,
		MAX_ID_LENGTH: 128,
		MAX_PROPERTY_LENGTH: 8192,
		MAX_STRING_LENGTH: 1024,
		MAX_URL_LENGTH: 2048,
		MAX_MESSAGE_LENGTH: 32768,
		MAX_EXCEPTION_LENGTH: 32768,
		sanitizeKeyAndAddUniqueness: si,
		sanitizeKey: Pa,
		sanitizeString: ae,
		sanitizeUrl: Tt,
		sanitizeMessage: Ar,
		sanitizeException: ci,
		sanitizeProperties: je,
		sanitizeMeasurements: ze,
		sanitizeId: ui,
		sanitizeInput: li,
		padNumber: ba,
		trim: oe,
	};
});
function Lt(t) {
	let e = null;
	if (j(Event)) {
		e = new Event(t);
	} else {
		let r = Ne();
		r &&
			r.createEvent &&
			((e = r.createEvent('Event')), e.initEvent(t, true, true));
	}
	return e;
}
let Aa = C(() => {
	J();
});
function ee(t, e) {
	return (
		e === void 0 && (e = false),
		t == null ? e : t.toString().toLowerCase() === 'true'
	);
}
function Ge(t) {
	(isNaN(t) || t < 0) && (t = 0), (t = Math.round(t));
	let e = '' + (t % 1e3),
		r = '' + (Math.floor(t / 1e3) % 60),
		n = '' + (Math.floor(t / (1e3 * 60)) % 60),
		i = '' + (Math.floor(t / (1e3 * 60 * 60)) % 24),
		a = Math.floor(t / (1e3 * 60 * 60 * 24));
	return (
		(e = e.length === 1 ? '00' + e : e.length === 2 ? '0' + e : e),
		(r = r.length < 2 ? '0' + r : r),
		(n = n.length < 2 ? '0' + n : n),
		(i = i.length < 2 ? '0' + i : i),
		(a > 0 ? a + '.' : '') + i + ':' + n + ':' + r + '.' + e
	);
}
function Nr() {
	let t = Ue();
	return 'sendBeacon' in t && t.sendBeacon;
}
function cn(t, e) {
	let r = null;
	return (
		R(t, function (n) {
			if (n.identifier === e) {
				return (r = n), -1;
			}
		}),
		r
	);
}
function un(t, e, r, n, i) {
	return !i && _(t) && (t === 'Script error.' || t === 'Script error');
}
let ln = C(() => {
	J();
});
let Et;
let lr;
let Ut;
let Fr;
let fn;
let le;
let lt = C(() => {
	(Et = 'Microsoft_ApplicationInsights_BypassAjaxInstrumentation'),
		(lr = 'sampleRate'),
		(Ut = 'ProcessLegacy'),
		(Fr = 'http.method'),
		(fn = 'https://dc.services.visualstudio.com'),
		(le = 'not_specified');
});
let Yt;
let Ke;
let Na = C(() => {
	(function (t) {
		(t[(t.LocalStorage = 0)] = 'LocalStorage'),
			(t[(t.SessionStorage = 1)] = 'SessionStorage');
	})(Yt || (Yt = {}));
	(function (t) {
		(t[(t.AI = 0)] = 'AI'),
			(t[(t.AI_AND_W3C = 1)] = 'AI_AND_W3C'),
			(t[(t.W3C = 2)] = 'W3C');
	})(Ke || (Ke = {}));
});
function Fa() {
	return kr() ? fi(Yt.LocalStorage) : null;
}
function fi(t) {
	try {
		if (x(ot())) {
			return null;
		}
		let e = new Date(),
			r = we(t === Yt.LocalStorage ? 'localStorage' : 'sessionStorage');
		r.setItem(e.toString(), e.toString());
		let n = r.getItem(e.toString()) !== e.toString();
		if ((r.removeItem(e.toString()), !n)) {
			return r;
		}
	} catch (i) {}
	return null;
}
function ka() {
	return wt() ? fi(Yt.SessionStorage) : null;
}
function pn() {
	(fr = false), (pr = false);
}
function kr() {
	return fr === void 0 && (fr = !!fi(Yt.LocalStorage)), fr;
}
function dn(t, e) {
	let r = Fa();
	if (r !== null) {
		try {
			return r.getItem(e);
		} catch (n) {
			(fr = false),
				t.throwInternal(
					S.WARNING,
					h.BrowserCannotReadLocalStorage,
					'Browser failed read of local storage. ' + G(n),
					{ exception: O(n) }
				);
		}
	}
	return null;
}
function mn(t, e, r) {
	let n = Fa();
	if (n !== null) {
		try {
			return n.setItem(e, r), true;
		} catch (i) {
			(fr = false),
				t.throwInternal(
					S.WARNING,
					h.BrowserCannotWriteLocalStorage,
					'Browser failed write to local storage. ' + G(i),
					{ exception: O(i) }
				);
		}
	}
	return false;
}
function gn(t, e) {
	let r = Fa();
	if (r !== null) {
		try {
			return r.removeItem(e), true;
		} catch (n) {
			(fr = false),
				t.throwInternal(
					S.WARNING,
					h.BrowserFailedRemovalFromLocalStorage,
					'Browser failed removal of local storage item. ' + G(n),
					{ exception: O(n) }
				);
		}
	}
	return false;
}
function wt() {
	return pr === void 0 && (pr = !!fi(Yt.SessionStorage)), pr;
}
function Ra() {
	let t = [];
	return (
		wt() &&
			Q(we('sessionStorage'), function (e) {
				t.push(e);
			}),
		t
	);
}
function $t(t, e) {
	let r = ka();
	if (r !== null) {
		try {
			return r.getItem(e);
		} catch (n) {
			(pr = false),
				t.throwInternal(
					S.WARNING,
					h.BrowserCannotReadSessionStorage,
					'Browser failed read of session storage. ' + G(n),
					{ exception: O(n) }
				);
		}
	}
	return null;
}
function Zt(t, e, r) {
	let n = ka();
	if (n !== null) {
		try {
			return n.setItem(e, r), true;
		} catch (i) {
			(pr = false),
				t.throwInternal(
					S.WARNING,
					h.BrowserCannotWriteSessionStorage,
					'Browser failed write to session storage. ' + G(i),
					{ exception: O(i) }
				);
		}
	}
	return false;
}
function vn(t, e) {
	let r = ka();
	if (r !== null) {
		try {
			return r.removeItem(e), true;
		} catch (n) {
			(pr = false),
				t.throwInternal(
					S.WARNING,
					h.BrowserFailedRemovalFromSessionStorage,
					'Browser failed removal of session storage item. ' + G(n),
					{ exception: O(n) }
				);
		}
	}
	return false;
}
let fr;
let pr;
let Ma = C(() => {
	J();
	Na();
	(fr = void 0), (pr = void 0);
});
function dr(t) {
	let e = ms,
		r = tl,
		n = r[e];
	return (
		ds.createElement
			? r[e] || (n = r[e] = ds.createElement('a'))
			: (n = { host: pi(t, true) }),
		(n.href = t),
		e++,
		e >= r.length && (e = 0),
		(ms = e),
		n
	);
}
function hn(t) {
	let e,
		r = dr(t);
	return r && (e = r.href), e;
}
function La(t) {
	let e,
		r = dr(t);
	return r && (e = r.pathname), e;
}
function xn(t, e) {
	return t ? t.toUpperCase() + ' ' + e : e;
}
function pi(t, e) {
	let r = yn(t, e) || '';
	if (r) {
		let n = r.match(/(www[0-9]?\.)?(.[^/:]+)(\:[\d]+)?/i);
		if (n != null && n.length > 3 && _(n[2]) && n[2].length > 0) {
			return n[2] + (n[3] || '');
		}
	}
	return r;
}
function yn(t, e) {
	let r = null;
	if (t) {
		let n = t.match(/(\w*):\/\/(.[^/:]+)(\:[\d]+)?/i);
		if (
			n != null &&
			n.length > 2 &&
			_(n[2]) &&
			n[2].length > 0 &&
			((r = n[2] || ''), e && n.length > 2)
		) {
			let i = (n[1] || '').toLowerCase(),
				a = n[3] || '';
			((i === 'http' && a === ':80') || (i === 'https' && a === ':443')) &&
				(a = ''),
				(r += a);
		}
	}
	return r;
}
let ds;
let ms;
let tl;
let Ua = C(() => {
	J();
	(ds = Ne() || {}), (ms = 0), (tl = [null, null, null, null, null]);
});
function Rr(t) {
	return rl.indexOf(t.toLowerCase()) !== -1;
}
function gs(t, e, r, n) {
	let i,
		a = n,
		o = n;
	if (e && e.length > 0) {
		let c = dr(e);
		if (((i = c.host), !a)) {
			if (c.pathname != null) {
				let s = c.pathname.length === 0 ? '/' : c.pathname;
				s.charAt(0) !== '/' && (s = '/' + s),
					(o = c.pathname),
					(a = ae(t, r ? r + ' ' + s : s));
			} else {
				a = ae(t, e);
			}
		}
	} else {
		(i = n), (a = n);
	}
	return { target: i, name: a, data: o };
}
function mr() {
	let t = Ye();
	if (t && t.now && t.timing) {
		let e = t.now() + t.timing.navigationStart;
		if (e > 0) {
			return e;
		}
	}
	return de();
}
function ve(t, e) {
	let r = null;
	return t !== 0 && e !== 0 && !x(t) && !x(e) && (r = e - t), r;
}
let rl;
let Sn;
let _a;
let Pt;
let Oa;
let Ha = C(() => {
	J();
	wa();
	ut();
	Aa();
	ln();
	lt();
	Ma();
	Ua();
	rl = [
		'https://dc.services.visualstudio.com/v2/track',
		'https://breeze.aimon.applicationinsights.io/v2/track',
		'https://dc-int.services.visualstudio.com/v2/track',
	];
	(Sn = {
		NotSpecified: le,
		createDomEvent: Lt,
		disableStorage: pn,
		isInternalApplicationInsightsEndpoint: Rr,
		canUseLocalStorage: kr,
		getStorage: dn,
		setStorage: mn,
		removeStorage: gn,
		canUseSessionStorage: wt,
		getSessionStorageKeys: Ra,
		getSessionStorage: $t,
		setSessionStorage: Zt,
		removeSessionStorage: vn,
		disableCookies: oi,
		canUseCookies: xa,
		disallowsSameSiteNone: ri,
		setCookie: Sa,
		stringToBoolOrDefault: ee,
		getCookie: ya,
		deleteCookie: Ca,
		trim: oe,
		newId: Wt,
		random32: function () {
			return It(true);
		},
		generateW3CId: He,
		isArray: Re,
		isError: Bt,
		isDate: wr,
		toISOStringForIE8: Me,
		getIEVersion: or,
		msToTimeSpan: Ge,
		isCrossOriginError: un,
		dump: O,
		getExceptionName: G,
		addEventHandler: zt,
		IsBeaconApiSupported: Nr,
		getExtension: cn,
	}),
		(_a = {
			parseUrl: dr,
			getAbsoluteUrl: hn,
			getPathName: La,
			getCompleteUrl: xn,
			parseHost: pi,
			parseFullHost: yn,
		}),
		(Pt = {
			correlationIdPrefix: 'cid-v1:',
			canIncludeCorrelationHeader: function (t, e, r) {
				if (!e || (t && t.disableCorrelationHeaders)) {
					return false;
				}
				if (t && t.correlationHeaderExcludePatterns) {
					for (var n = 0; n < t.correlationHeaderExcludePatterns.length; n++) {
						if (t.correlationHeaderExcludePatterns[n].test(e)) {
							return false;
						}
					}
				}
				let i = dr(e).host.toLowerCase();
				if (
					(i &&
						(i.indexOf(':443') !== -1 || i.indexOf(':80') !== -1) &&
						(i = (yn(e, true) || '').toLowerCase()),
					(!t || !t.enableCorsCorrelation) && i && i !== r)
				) {
					return false;
				}
				let a = t && t.correlationHeaderDomains;
				if (a) {
					let o;
					if (
						(R(a, function (u) {
							let l = new RegExp(
								u
									.toLowerCase()
									.replace(/\\/g, '\\\\')
									.replace(/\./g, '\\.')
									.replace(/\*/g, '.*')
							);
							o = o || l.test(i);
						}),
						!o)
					) {
						return false;
					}
				}
				let c = t && t.correlationHeaderExcludedDomains;
				if (!c || c.length === 0) {
					return true;
				}
				for (var n = 0; n < c.length; n++) {
					let s = new RegExp(
						c[n]
							.toLowerCase()
							.replace(/\\/g, '\\\\')
							.replace(/\./g, '\\.')
							.replace(/\*/g, '.*')
					);
					if (s.test(i)) {
						return false;
					}
				}
				return i && i.length > 0;
			},
			getCorrelationContext: function (t) {
				if (t) {
					let e = Pt.getCorrelationContextValue(t, te.requestContextTargetKey);
					if (e && e !== Pt.correlationIdPrefix) {
						return e;
					}
				}
			},
			getCorrelationContextValue: function (t, e) {
				if (t) {
					for (let r = t.split(','), n = 0; n < r.length; ++n) {
						let i = r[n].split('=');
						if (i.length === 2 && i[0] === e) {
							return i[1];
						}
					}
				}
			},
		});
	Oa = { Now: mr, GetDuration: ve };
});
function di(t) {
	if (!t) {
		return {};
	}
	let e = t.split(nl),
		r = Kr(
			e,
			function (i, a) {
				let o = a.split(il);
				if (o.length === 2) {
					let c = o[0].toLowerCase(),
						s = o[1];
					i[c] = s;
				}
				return i;
			},
			{}
		);
	if (Qe(r).length > 0) {
		if (r.endpointsuffix) {
			let n = r.location ? r.location + '.' : '';
			r.ingestionendpoint =
				r.ingestionendpoint || 'https://' + n + 'dc.' + r.endpointsuffix;
		}
		r.ingestionendpoint = r.ingestionendpoint || fn;
	}
	return r;
}
let nl;
let il;
let ja;
let vs = C(() => {
	lt();
	J();
	(nl = ';'), (il = '=');
	ja = { parse: di };
});
let Cn;
let za = C(() => {
	Cn = (function () {
		function t() {}
		return t;
	})();
});
let In;
let Ba = C(() => {
	ne();
	za();
	In = (function (t) {
		H(e, t);
		function e() {
			return t.call(this) || this;
		}
		return e;
	})(Cn);
});
let hs;
let xs = C(() => {
	hs = (function () {
		function t() {
			(this.ver = 1), (this.sampleRate = 100), (this.tags = {});
		}
		return t;
	})();
});
let Tn;
let ys = C(() => {
	ne();
	xs();
	ut();
	J();
	lt();
	Tn = (function (t) {
		H(e, t);
		function e(r, n, i) {
			let a = t.call(this) || this;
			return (
				(a.name = ae(r, i) || le),
				(a.data = n),
				(a.time = Me(new Date())),
				(a.aiDataContract = {
					time: 1,
					iKey: 1,
					name: 1,
					sampleRate: function () {
						return a.sampleRate === 100 ? 4 : 1;
					},
					tags: 1,
					data: 1,
				}),
				a
			);
		}
		return e;
	})(hs);
});
let mi;
let Va = C(() => {
	mi = (function () {
		function t() {
			(this.ver = 2), (this.properties = {}), (this.measurements = {});
		}
		return t;
	})();
});
let Be;
let Ss = C(() => {
	ne();
	Va();
	ut();
	lt();
	Be = (function (t) {
		H(e, t);
		function e(r, n, i, a) {
			let o = t.call(this) || this;
			return (
				(o.aiDataContract = {
					ver: 1,
					name: 1,
					properties: 0,
					measurements: 0,
				}),
				(o.name = ae(r, n) || le),
				(o.properties = je(r, i)),
				(o.measurements = ze(r, a)),
				o
			);
		}
		return (
			(e.envelopeType = 'Microsoft.ApplicationInsights.{0}.Event'),
			(e.dataType = 'EventData'),
			e
		);
	})(mi);
});
let Cs;
let Is = C(() => {
	Cs = (function () {
		function t() {}
		return t;
	})();
});
let Ts;
let Es = C(() => {
	Ts = (function () {
		function t() {
			(this.ver = 2),
				(this.exceptions = []),
				(this.properties = {}),
				(this.measurements = {});
		}
		return t;
	})();
});
let ws;
let Ps = C(() => {
	ws = (function () {
		function t() {
			(this.hasFullStack = true), (this.parsedStack = []);
		}
		return t;
	})();
});
function Ka(t, e) {
	let r = t;
	return (
		r &&
			!_(r) &&
			(JSON && JSON.stringify
				? ((r = JSON.stringify(t)),
				  e &&
						(!r || r === '{}') &&
						(j(t.toString) ? (r = t.toString()) : (r = '' + t)))
				: (r = '' + t + ' - (Missing JSON.stringify)')),
		r || ''
	);
}
function As(t, e) {
	let r = t;
	return (
		t &&
			((r = t[Ga] || t[Ds] || ''),
			r && !_(r) && (r = Ka(r, true)),
			t.filename &&
				(r =
					r +
					' @' +
					(t.filename || '') +
					':' +
					(t.lineno || '?') +
					':' +
					(t.colno || '?'))),
		e &&
			e !== 'String' &&
			e !== 'Object' &&
			e !== 'Error' &&
			(r || '').indexOf(e) === -1 &&
			(r = e + ': ' + r),
		r || ''
	);
}
function ol(t) {
	return st(t) ? 'hasFullStack' in t && 'typeName' in t : false;
}
function sl(t) {
	return st(t) ? 'ver' in t && 'exceptions' in t && 'properties' in t : false;
}
function Ns(t) {
	return t && t.src && _(t.src) && t.obj && Re(t.obj);
}
function Lr(t) {
	let e = t || '';
	_(e) || (_(e[ft]) ? (e = e[ft]) : (e = '' + e));
	let r = e.split(`
`);
	return { src: e, obj: r };
}
function cl(t) {
	for (
		var e = [],
			r = t.split(`
`),
			n = 0;
		n < r.length;
		n++
	) {
		let i = r[n];
		r[n + 1] && ((i += '@' + r[n + 1]), n++), e.push(i);
	}
	return { src: t, obj: e };
}
function Fs(t) {
	let e = null;
	if (t) {
		try {
			if (t[ft]) {
				e = Lr(t[ft]);
			} else if (t[Mr] && t[Mr][ft]) {
				e = Lr(t[Mr][ft]);
			} else if (t.exception && t.exception[ft]) {
				e = Lr(t.exception[ft]);
			} else if (Ns(t)) {
				e = t;
			} else if (Ns(t[qa])) {
				e = t[qa];
			} else if (window.opera && t[Ga]) {
				e = cl(t.message);
			} else if (_(t)) {
				e = Lr(t);
			} else {
				let r = t[Ga] || t[Ds] || '';
				_(t[bs]) &&
					(r &&
						(r += `
`),
					(r += ' from ' + t[bs])),
					r && (e = Lr(r));
			}
		} catch (n) {
			e = Lr(n);
		}
	}
	return e || { src: '', obj: null };
}
function ul(t) {
	let e = '';
	return (
		t &&
			(t.obj
				? R(t.obj, function (r) {
						e +=
							r +
							`
`;
				  })
				: (e = t.src || '')),
		e
	);
}
function ll(t) {
	let e,
		r = t.obj;
	if (r && r.length > 0) {
		e = [];
		let n = 0,
			i = 0;
		R(r, function (E) {
			let b = E.toString();
			if (Ja.regex.test(b)) {
				let p = new Ja(b, n++);
				(i += p.sizeInBytes), e.push(p);
			}
		});
		let a = 32 * 1024;
		if (i > a) {
			for (let o = 0, c = e.length - 1, s = 0, u = o, l = c; o < c; ) {
				let f = e[o].sizeInBytes,
					m = e[c].sizeInBytes;
				if (((s += f + m), s > a)) {
					let I = l - u + 1;
					e.splice(u, I);
					break;
				}
				(u = o), (l = c), o++, c--;
			}
		}
	}
	return e;
}
function gi(t) {
	let e = '';
	if (t && ((e = t.typeName || t.name || ''), !e)) {
		try {
			let r = /function (.{1,200})\(/,
				n = r.exec(t.constructor.toString());
			e = n && n.length > 1 ? n[1] : '';
		} catch (i) {}
	}
	return e;
}
function Wa(t) {
	if (t) {
		try {
			if (!_(t)) {
				let e = gi(t),
					r = Ka(t, false);
				return (
					(!r || r === '{}') &&
						(t[Mr] && ((t = t[Mr]), (e = gi(t))), (r = Ka(t, true))),
					r.indexOf(e) !== 0 && e !== 'String' ? e + ':' + r : r
				);
			}
		} catch (n) {}
	}
	return '' + (t || '');
}
let al;
let Mr;
let ft;
let qa;
let bs;
let Ga;
let Ds;
let he;
let ks;
let Ja;
let Rs = C(() => {
	ne();
	Is();
	Es();
	Ps();
	ut();
	J();
	lt();
	(al = '<no_method>'),
		(Mr = 'error'),
		(ft = 'stack'),
		(qa = 'stackDetails'),
		(bs = 'errorSrc'),
		(Ga = 'message'),
		(Ds = 'description');
	(he = (function (t) {
		H(e, t);
		function e(r, n, i, a, o, c) {
			let s = t.call(this) || this;
			return (
				(s.aiDataContract = {
					ver: 1,
					exceptions: 1,
					severityLevel: 0,
					properties: 0,
					measurements: 0,
				}),
				sl(n)
					? ((s.exceptions = n.exceptions),
					  (s.properties = n.properties),
					  (s.measurements = n.measurements),
					  n.severityLevel && (s.severityLevel = n.severityLevel),
					  n.id && (s.id = n.id),
					  n.problemGroup && (s.problemGroup = n.problemGroup),
					  (s.ver = 2),
					  x(n.isManual) || (s.isManual = n.isManual))
					: (i || (i = {}),
					  (s.exceptions = [new ks(r, n, i)]),
					  (s.properties = je(r, i)),
					  (s.measurements = ze(r, a)),
					  o && (s.severityLevel = o),
					  c && (s.id = c)),
				s
			);
		}
		return (
			(e.CreateAutoException = function (r, n, i, a, o, c, s, u) {
				let l = gi(o || c || r);
				return {
					message: As(r, l),
					url: n,
					lineNumber: i,
					columnNumber: a,
					error: Wa(o || c || r),
					evt: Wa(c || r),
					typeName: l,
					stackDetails: Fs(s || o || c),
					errorSrc: u,
				};
			}),
			(e.CreateFromInterface = function (r, n, i, a) {
				let o =
						n.exceptions &&
						Vt(n.exceptions, function (s) {
							return ks.CreateFromInterface(r, s);
						}),
					c = new e(r, yt({}, n, { exceptions: o }), i, a);
				return c;
			}),
			(e.prototype.toInterface = function () {
				let r = this,
					n = r.exceptions,
					i = r.properties,
					a = r.measurements,
					o = r.severityLevel,
					c = r.ver,
					s = r.problemGroup,
					u = r.id,
					l = r.isManual,
					f =
						(n instanceof Array &&
							Vt(n, function (m) {
								return m.toInterface();
							})) ||
						void 0;
				return {
					ver: '4.0',
					exceptions: f,
					severityLevel: o,
					properties: i,
					measurements: a,
					problemGroup: s,
					id: u,
					isManual: l,
				};
			}),
			(e.CreateSimpleException = function (r, n, i, a, o, c) {
				return {
					exceptions: [
						{ hasFullStack: true, message: r, stack: o, typeName: n },
					],
				};
			}),
			(e.envelopeType = 'Microsoft.ApplicationInsights.{0}.Exception'),
			(e.dataType = 'ExceptionData'),
			(e.formatError = Wa),
			e
		);
	})(Ts)),
		(ks = (function (t) {
			H(e, t);
			function e(r, n, i) {
				let a = t.call(this) || this;
				if (
					((a.aiDataContract = {
						id: 0,
						outerId: 0,
						typeName: 1,
						message: 1,
						hasFullStack: 0,
						stack: 0,
						parsedStack: 2,
					}),
					ol(n))
				) {
					(a.typeName = n.typeName),
						(a.message = n.message),
						(a[ft] = n[ft]),
						(a.parsedStack = n.parsedStack),
						(a.hasFullStack = n.hasFullStack);
				} else {
					let o = n,
						c = o && o.evt;
					Bt(o) || (o = o[Mr] || c || o),
						(a.typeName = ae(r, gi(o)) || le),
						(a.message = Ar(r, As(n || o, a.typeName)) || le);
					let s = n[qa] || Fs(n);
					(a.parsedStack = ll(s)),
						(a[ft] = ci(r, ul(s))),
						(a.hasFullStack = Re(a.parsedStack) && a.parsedStack.length > 0),
						i && (i.typeName = i.typeName || a.typeName);
				}
				return a;
			}
			return (
				(e.prototype.toInterface = function () {
					let r =
							this.parsedStack instanceof Array &&
							Vt(this.parsedStack, function (i) {
								return i.toInterface();
							}),
						n = {
							id: this.id,
							outerId: this.outerId,
							typeName: this.typeName,
							message: this.message,
							hasFullStack: this.hasFullStack,
							stack: this[ft],
							parsedStack: r || void 0,
						};
					return n;
				}),
				(e.CreateFromInterface = function (r, n) {
					let i =
							(n.parsedStack instanceof Array &&
								Vt(n.parsedStack, function (o) {
									return Ja.CreateFromInterface(o);
								})) ||
							n.parsedStack,
						a = new e(r, yt({}, n, { parsedStack: i }));
					return a;
				}),
				e
			);
		})(ws)),
		(Ja = (function (t) {
			H(e, t);
			function e(r, n) {
				let i = t.call(this) || this;
				if (
					((i.sizeInBytes = 0),
					(i.aiDataContract = {
						level: 1,
						method: 1,
						assembly: 0,
						fileName: 0,
						line: 0,
					}),
					typeof r === 'string')
				) {
					let a = r;
					(i.level = n),
						(i.method = al),
						(i.assembly = oe(a)),
						(i.fileName = ''),
						(i.line = 0);
					let o = a.match(e.regex);
					o &&
						o.length >= 5 &&
						((i.method = oe(o[2]) || i.method),
						(i.fileName = oe(o[4])),
						(i.line = parseInt(o[5]) || 0));
				} else {
					(i.level = r.level),
						(i.method = r.method),
						(i.assembly = r.assembly),
						(i.fileName = r.fileName),
						(i.line = r.line),
						(i.sizeInBytes = 0);
				}
				return (
					(i.sizeInBytes += i.method.length),
					(i.sizeInBytes += i.fileName.length),
					(i.sizeInBytes += i.assembly.length),
					(i.sizeInBytes += e.baseSize),
					(i.sizeInBytes += i.level.toString().length),
					(i.sizeInBytes += i.line.toString().length),
					i
				);
			}
			return (
				(e.CreateFromInterface = function (r) {
					return new e(r, null);
				}),
				(e.prototype.toInterface = function () {
					return {
						level: this.level,
						method: this.method,
						assembly: this.assembly,
						fileName: this.fileName,
						line: this.line,
					};
				}),
				(e.regex = /^([\s]+at)?[\s]{0,50}([^\@\()]+?)[\s]{0,50}(\@|\()([^\(\n]+):([0-9]+):([0-9]+)(\)?)$/),
				(e.baseSize = 58),
				e
			);
		})(Cs));
});
let Ms;
let Ls = C(() => {
	Ms = (function () {
		function t() {
			(this.ver = 2),
				(this.metrics = []),
				(this.properties = {}),
				(this.measurements = {});
		}
		return t;
	})();
});
let vi;
let Us = C(() => {
	(function (t) {
		(t[(t.Measurement = 0)] = 'Measurement'),
			(t[(t.Aggregation = 1)] = 'Aggregation');
	})(vi || (vi = {}));
});
let _s;
let Os = C(() => {
	Us();
	_s = (function () {
		function t() {
			this.kind = vi.Measurement;
		}
		return t;
	})();
});
let Hs;
let js = C(() => {
	ne();
	Os();
	Hs = (function (t) {
		H(e, t);
		function e() {
			let r = (t !== null && t.apply(this, arguments)) || this;
			return (
				(r.aiDataContract = {
					name: 1,
					kind: 0,
					value: 1,
					count: 0,
					min: 0,
					max: 0,
					stdDev: 0,
				}),
				r
			);
		}
		return e;
	})(_s);
});
let Ve;
let zs = C(() => {
	ne();
	Ls();
	ut();
	js();
	lt();
	Ve = (function (t) {
		H(e, t);
		function e(r, n, i, a, o, c, s, u) {
			let l = t.call(this) || this;
			l.aiDataContract = { ver: 1, metrics: 1, properties: 0 };
			let f = new Hs();
			return (
				(f.count = a > 0 ? a : void 0),
				(f.max = isNaN(c) || c === null ? void 0 : c),
				(f.min = isNaN(o) || o === null ? void 0 : o),
				(f.name = ae(r, n) || le),
				(f.value = i),
				(l.metrics = [f]),
				(l.properties = je(r, s)),
				(l.measurements = ze(r, u)),
				l
			);
		}
		return (
			(e.envelopeType = 'Microsoft.ApplicationInsights.{0}.Metric'),
			(e.dataType = 'MetricData'),
			e
		);
	})(Ms);
});
let gr;
let hi = C(() => {
	ne();
	Va();
	gr = (function (t) {
		H(e, t);
		function e() {
			let r = t.call(this) || this;
			return (r.ver = 2), (r.properties = {}), (r.measurements = {}), r;
		}
		return e;
	})(mi);
});
let Fe;
let Bs = C(() => {
	ne();
	hi();
	ut();
	ln();
	lt();
	Fe = (function (t) {
		H(e, t);
		function e(r, n, i, a, o, c, s) {
			let u = t.call(this) || this;
			return (
				(u.aiDataContract = {
					ver: 1,
					name: 0,
					url: 0,
					duration: 0,
					properties: 0,
					measurements: 0,
					id: 0,
				}),
				(u.id = ui(r, s)),
				(u.url = Tt(r, i)),
				(u.name = ae(r, n) || le),
				isNaN(a) || (u.duration = Ge(a)),
				(u.properties = je(r, o)),
				(u.measurements = ze(r, c)),
				u
			);
		}
		return (
			(e.envelopeType = 'Microsoft.ApplicationInsights.{0}.Pageview'),
			(e.dataType = 'PageviewData'),
			e
		);
	})(gr);
});
let Vs;
let qs = C(() => {
	Vs = (function () {
		function t() {
			(this.ver = 2),
				(this.success = true),
				(this.properties = {}),
				(this.measurements = {});
		}
		return t;
	})();
});
let qe;
let Gs = C(() => {
	ne();
	ut();
	Ha();
	qs();
	ln();
	qe = (function (t) {
		H(e, t);
		function e(r, n, i, a, o, c, s, u, l, f, m, I) {
			l === void 0 && (l = 'Ajax');
			let E = t.call(this) || this;
			(E.aiDataContract = {
				id: 1,
				ver: 1,
				name: 0,
				resultCode: 0,
				duration: 0,
				success: 0,
				data: 0,
				target: 0,
				type: 0,
				properties: 0,
				measurements: 0,
				kind: 0,
				value: 0,
				count: 0,
				min: 0,
				max: 0,
				stdDev: 0,
				dependencyKind: 0,
				dependencySource: 0,
				commandName: 0,
				dependencyTypeName: 0,
			}),
				(E.id = n),
				(E.duration = Ge(o)),
				(E.success = c),
				(E.resultCode = s + ''),
				(E.type = ae(r, l));
			let b = gs(r, i, u, a);
			return (
				(E.data = Tt(r, a) || b.data),
				(E.target = ae(r, b.target)),
				f && (E.target = E.target + ' | ' + f),
				(E.name = ae(r, b.name)),
				(E.properties = je(r, m)),
				(E.measurements = ze(r, I)),
				E
			);
		}
		return (
			(e.envelopeType = 'Microsoft.ApplicationInsights.{0}.RemoteDependency'),
			(e.dataType = 'RemoteDependencyData'),
			e
		);
	})(Vs);
});
let Ks;
let Ws = C(() => {
	Ks = (function () {
		function t() {
			(this.ver = 2), (this.properties = {}), (this.measurements = {});
		}
		return t;
	})();
});
let $e;
let Js = C(() => {
	ne();
	Ws();
	ut();
	lt();
	$e = (function (t) {
		H(e, t);
		function e(r, n, i, a, o) {
			let c = t.call(this) || this;
			return (
				(c.aiDataContract = {
					ver: 1,
					message: 1,
					severityLevel: 0,
					properties: 0,
				}),
				(n = n || le),
				(c.message = Ar(r, n)),
				(c.properties = je(r, a)),
				(c.measurements = ze(r, o)),
				i && (c.severityLevel = i),
				c
			);
		}
		return (
			(e.envelopeType = 'Microsoft.ApplicationInsights.{0}.Message'),
			(e.dataType = 'MessageData'),
			e
		);
	})(Ks);
});
let Xs;
let Ys = C(() => {
	ne();
	hi();
	Xs = (function (t) {
		H(e, t);
		function e() {
			let r = t.call(this) || this;
			return (r.ver = 2), (r.properties = {}), (r.measurements = {}), r;
		}
		return e;
	})(gr);
});
let Ze;
let $s = C(() => {
	ne();
	Ys();
	ut();
	lt();
	Ze = (function (t) {
		H(e, t);
		function e(r, n, i, a, o, c, s) {
			let u = t.call(this) || this;
			return (
				(u.aiDataContract = {
					ver: 1,
					name: 0,
					url: 0,
					duration: 0,
					perfTotal: 0,
					networkConnect: 0,
					sentRequest: 0,
					receivedResponse: 0,
					domProcessing: 0,
					properties: 0,
					measurements: 0,
				}),
				(u.url = Tt(r, i)),
				(u.name = ae(r, n) || le),
				(u.properties = je(r, o)),
				(u.measurements = ze(r, c)),
				s &&
					((u.domProcessing = s.domProcessing),
					(u.duration = s.duration),
					(u.networkConnect = s.networkConnect),
					(u.perfTotal = s.perfTotal),
					(u.receivedResponse = s.receivedResponse),
					(u.sentRequest = s.sentRequest)),
				u
			);
		}
		return (
			(e.envelopeType =
				'Microsoft.ApplicationInsights.{0}.PageviewPerformance'),
			(e.dataType = 'PageviewPerformanceData'),
			e
		);
	})(Xs);
});
let xt;
let Zs = C(() => {
	ne();
	Ba();
	xt = (function (t) {
		H(e, t);
		function e(r, n) {
			let i = t.call(this) || this;
			return (
				(i.aiDataContract = { baseType: 1, baseData: 1 }),
				(i.baseType = r),
				(i.baseData = n),
				i
			);
		}
		return e;
	})(In);
});
let _t;
let Qs = C(() => {
	(function (t) {
		(t[(t.Verbose = 0)] = 'Verbose'),
			(t[(t.Information = 1)] = 'Information'),
			(t[(t.Warning = 2)] = 'Warning'),
			(t[(t.Error = 3)] = 'Error'),
			(t[(t.Critical = 4)] = 'Critical');
	})(_t || (_t = {}));
});
let Xa;
let ec = C(() => {
	J();
	Xa = (function () {
		function t() {}
		return (
			(t.getConfig = function (e, r, n, i) {
				i === void 0 && (i = false);
				let a;
				return (
					n &&
					e.extensionConfig &&
					e.extensionConfig[n] &&
					!x(e.extensionConfig[n][r])
						? (a = e.extensionConfig[n][r])
						: (a = e[r]),
					x(a) ? i : a
				);
			}),
			t
		);
	})();
});
function Qt(t) {
	let e = 'ai.' + t + '.';
	return function (r) {
		return e + r;
	};
}
let En;
let be;
let xi;
let Ur;
let Ya;
let er;
let vr;
let wn;
let hr;
let $a = C(() => {
	ne();
	J();
	(En = Qt('application')),
		(be = Qt('device')),
		(xi = Qt('location')),
		(Ur = Qt('operation')),
		(Ya = Qt('session')),
		(er = Qt('user')),
		(vr = Qt('cloud')),
		(wn = Qt('internal')),
		(hr = (function (t) {
			H(e, t);
			function e() {
				return t.call(this) || this;
			}
			return e;
		})(
			qi({
				applicationVersion: En('ver'),
				applicationBuild: En('build'),
				applicationTypeId: En('typeId'),
				applicationId: En('applicationId'),
				applicationLayer: En('layer'),
				deviceId: be('id'),
				deviceIp: be('ip'),
				deviceLanguage: be('language'),
				deviceLocale: be('locale'),
				deviceModel: be('model'),
				deviceFriendlyName: be('friendlyName'),
				deviceNetwork: be('network'),
				deviceNetworkName: be('networkName'),
				deviceOEMName: be('oemName'),
				deviceOS: be('os'),
				deviceOSVersion: be('osVersion'),
				deviceRoleInstance: be('roleInstance'),
				deviceRoleName: be('roleName'),
				deviceScreenResolution: be('screenResolution'),
				deviceType: be('type'),
				deviceMachineName: be('machineName'),
				deviceVMName: be('vmName'),
				deviceBrowser: be('browser'),
				deviceBrowserVersion: be('browserVersion'),
				locationIp: xi('ip'),
				locationCountry: xi('country'),
				locationProvince: xi('province'),
				locationCity: xi('city'),
				operationId: Ur('id'),
				operationName: Ur('name'),
				operationParentId: Ur('parentId'),
				operationRootId: Ur('rootId'),
				operationSyntheticSource: Ur('syntheticSource'),
				operationCorrelationVector: Ur('correlationVector'),
				sessionId: Ya('id'),
				sessionIsFirst: Ya('isFirst'),
				sessionIsNew: Ya('isNew'),
				userAccountAcquisitionDate: er('accountAcquisitionDate'),
				userAccountId: er('accountId'),
				userAgent: er('userAgent'),
				userId: er('id'),
				userStoreRegion: er('storeRegion'),
				userAuthUserId: er('authUserId'),
				userAnonymousUserAcquisitionDate: er('anonUserAcquisitionDate'),
				userAuthenticatedUserAcquisitionDate: er('authUserAcquisitionDate'),
				cloudName: vr('name'),
				cloudRole: vr('role'),
				cloudRoleVer: vr('roleVer'),
				cloudRoleInstance: vr('roleInstance'),
				cloudEnvironment: vr('environment'),
				cloudLocation: vr('location'),
				cloudDeploymentUnit: vr('deploymentUnit'),
				internalNodeName: wn('nodeName'),
				internalSdkVersion: wn('sdkVersion'),
				internalAgentVersion: wn('agentVersion'),
				internalSnippet: wn('snippet'),
				internalSdkSrc: wn('sdkSrc'),
			})
		));
});
let rt;
let tc = C(() => {
	ut();
	J();
	lt();
	rt = (function () {
		function t() {}
		return (
			(t.create = function (e, r, n, i, a, o) {
				if (((n = ae(i, n) || le), x(e) || x(r) || x(n))) {
					throw Error("Input doesn't contain all required fields");
				}
				let c = {
					name: n,
					time: Me(new Date()),
					iKey: '',
					ext: o || {},
					tags: [],
					data: {},
					baseType: r,
					baseData: e,
				};
				return (
					x(a) ||
						Q(a, function (s, u) {
							c.data[s] = u;
						}),
					c
				);
			}),
			t
		);
	})();
});
let _e;
let re;
let rc = C(() => {
	$a();
	(_e = {
		UserExt: 'user',
		DeviceExt: 'device',
		TraceExt: 'trace',
		WebExt: 'web',
		AppExt: 'app',
		OSExt: 'os',
		SessionExt: 'ses',
		SDKExt: 'sdk',
	}),
		(re = new hr());
});
let Ot;
let _r;
let yi;
let xe = C(() => {
	Ha();
	vs();
	wa();
	lt();
	Ba();
	za();
	ys();
	Ss();
	Rs();
	zs();
	Bs();
	hi();
	Gs();
	Js();
	$s();
	Zs();
	Qs();
	ec();
	$a();
	ut();
	tc();
	rc();
	Na();
	ln();
	Aa();
	Ma();
	Ua();
	(Ot = 'AppInsightsPropertiesPlugin'),
		(_r = 'AppInsightsChannelPlugin'),
		(yi = 'ApplicationInsightsAnalytics');
});
let nc;
let ic = C(() => {
	xe();
	J();
	Te();
	nc = (function () {
		function t(e, r, n, i) {
			W(t, this, function (a) {
				let o = null,
					c = [],
					s = false,
					u;
				n && (u = n.logger);
				function l() {
					n &&
						R(n.getTransmissionControls(), function (m) {
							R(m, function (I) {
								return I.flush(true);
							});
						});
				}
				function f(m) {
					c.push(m),
						o ||
							(o = setInterval(function () {
								let I = c.slice(0),
									E = false;
								(c = []),
									R(I, function (b) {
										b() ? (E = true) : c.push(b);
									}),
									c.length === 0 && (clearInterval(o), (o = null)),
									E && l();
							}, 100));
				}
				a.trackPageView = function (m, I) {
					let E = m.name;
					if (x(E) || typeof E !== 'string') {
						let b = Ne();
						E = m.name = (b && b.title) || '';
					}
					let p = m.uri;
					if (x(p) || typeof p !== 'string') {
						let v = et();
						p = m.uri = (v && v.href) || '';
					}
					if (!i.isPerformanceTimingSupported()) {
						e.sendPageViewInternal(m, I),
							l(),
							u.throwInternal(
								S.WARNING,
								h.NavigationTimingNotSupported,
								'trackPageView: navigation timing API used for calculation of page duration is not supported in this browser. This page view will be collected without duration and timing info.'
							);
						return;
					}
					let y = false,
						w,
						L = i.getPerformanceTiming().navigationStart;
					L > 0 &&
						((w = ve(L, +new Date())),
						i.shouldCollectDuration(w) || (w = void 0));
					let F;
					!x(I) && !x(I.duration) && (F = I.duration),
						(r || !isNaN(F)) &&
							(isNaN(F) && (I || (I = {}), (I.duration = w)),
							e.sendPageViewInternal(m, I),
							l(),
							(y = true));
					let Y = 6e4;
					I || (I = {}),
						f(function () {
							let Se = false;
							try {
								if (i.isPerformanceTimingDataReady()) {
									Se = true;
									let X = { name: E, uri: p };
									i.populatePageViewPerformanceEvent(X),
										!X.isValid && !y
											? ((I.duration = w), e.sendPageViewInternal(m, I))
											: (y ||
													((I.duration = X.durationMs),
													e.sendPageViewInternal(m, I)),
											  s ||
													(e.sendPageViewPerformanceInternal(X, I),
													(s = true)));
								} else {
									L > 0 &&
										ve(L, +new Date()) > Y &&
										((Se = true),
										y || ((I.duration = Y), e.sendPageViewInternal(m, I)));
								}
							} catch (me) {
								u.throwInternal(
									S.CRITICAL,
									h.TrackPVFailedCalc,
									'trackPageView failed on page load calculation: ' + G(me),
									{ exception: O(me) }
								);
							}
							return Se;
						});
				};
			});
		}
		return t;
	})();
});
let ac;
let fl;
let oc = C(() => {
	xe();
	J();
	(ac = (function () {
		function t(e, r) {
			(this.prevPageVisitDataKeyName = 'prevPageVisitData'),
				(this.pageVisitTimeTrackingHandler = r),
				(this._logger = e);
		}
		return (
			(t.prototype.trackPreviousPageVisit = function (e, r) {
				try {
					let n = this.restartPageVisitTimer(e, r);
					n &&
						this.pageVisitTimeTrackingHandler(
							n.pageName,
							n.pageUrl,
							n.pageVisitTime
						);
				} catch (i) {
					this._logger.warnToConsole(
						'Auto track page visit time failed, metric will not be collected: ' +
							O(i)
					);
				}
			}),
			(t.prototype.restartPageVisitTimer = function (e, r) {
				try {
					let n = this.stopPageVisitTimer();
					return this.startPageVisitTimer(e, r), n;
				} catch (i) {
					return (
						this._logger.warnToConsole('Call to restart failed: ' + O(i)), null
					);
				}
			}),
			(t.prototype.startPageVisitTimer = function (e, r) {
				try {
					if (wt()) {
						$t(this._logger, this.prevPageVisitDataKeyName) != null &&
							Ae(
								'Cannot call startPageVisit consecutively without first calling stopPageVisit'
							);
						let n = new fl(e, r),
							i = Pe().stringify(n);
						Zt(this._logger, this.prevPageVisitDataKeyName, i);
					}
				} catch (a) {
					this._logger.warnToConsole('Call to start failed: ' + O(a));
				}
			}),
			(t.prototype.stopPageVisitTimer = function () {
				try {
					if (wt()) {
						let e = de(),
							r = $t(this._logger, this.prevPageVisitDataKeyName);
						if (r && vt()) {
							let n = Pe().parse(r);
							return (
								(n.pageVisitTime = e - n.pageVisitStartTime),
								vn(this._logger, this.prevPageVisitDataKeyName),
								n
							);
						} else {
							return null;
						}
					}
					return null;
				} catch (i) {
					return (
						this._logger.warnToConsole('Stop page visit timer failed: ' + O(i)),
						null
					);
				}
			}),
			t
		);
	})()),
		(fl = (function () {
			function t(e, r) {
				(this.pageVisitStartTime = de()),
					(this.pageName = e),
					(this.pageUrl = r);
			}
			return t;
		})());
});
let sc;
let cc = C(() => {
	xe();
	J();
	sc = (function () {
		function t(e) {
			(this.MAX_DURATION_ALLOWED = 36e5), e && (this._logger = e.logger);
		}
		return (
			(t.prototype.populatePageViewPerformanceEvent = function (e) {
				e.isValid = false;
				let r = this.getPerformanceNavigationTiming(),
					n = this.getPerformanceTiming(),
					i = 0,
					a = 0,
					o = 0,
					c = 0,
					s = 0;
				(r || n) &&
					(r
						? ((i = r.duration),
						  (a =
								r.startTime === 0
									? r.connectEnd
									: ve(r.startTime, r.connectEnd)),
						  (o = ve(r.requestStart, r.responseStart)),
						  (c = ve(r.responseStart, r.responseEnd)),
						  (s = ve(r.responseEnd, r.loadEventEnd)))
						: ((i = ve(n.navigationStart, n.loadEventEnd)),
						  (a = ve(n.navigationStart, n.connectEnd)),
						  (o = ve(n.requestStart, n.responseStart)),
						  (c = ve(n.responseStart, n.responseEnd)),
						  (s = ve(n.responseEnd, n.loadEventEnd))),
					i === 0
						? this._logger.throwInternal(
								S.WARNING,
								h.ErrorPVCalc,
								'error calculating page view performance.',
								{ total: i, network: a, request: o, response: c, dom: s }
						  )
						: this.shouldCollectDuration(i, a, o, c, s)
						? i < Math.floor(a) + Math.floor(o) + Math.floor(c) + Math.floor(s)
							? this._logger.throwInternal(
									S.WARNING,
									h.ClientPerformanceMathError,
									'client performance math error.',
									{ total: i, network: a, request: o, response: c, dom: s }
							  )
							: ((e.durationMs = i),
							  (e.perfTotal = e.duration = Ge(i)),
							  (e.networkConnect = Ge(a)),
							  (e.sentRequest = Ge(o)),
							  (e.receivedResponse = Ge(c)),
							  (e.domProcessing = Ge(s)),
							  (e.isValid = true))
						: this._logger.throwInternal(
								S.WARNING,
								h.InvalidDurationValue,
								"Invalid page load duration value. Browser perf data won't be sent.",
								{ total: i, network: a, request: o, response: c, dom: s }
						  ));
			}),
			(t.prototype.getPerformanceTiming = function () {
				return this.isPerformanceTimingSupported() ? Ye().timing : null;
			}),
			(t.prototype.getPerformanceNavigationTiming = function () {
				return this.isPerformanceNavigationTimingSupported()
					? Ye().getEntriesByType('navigation')[0]
					: null;
			}),
			(t.prototype.isPerformanceNavigationTimingSupported = function () {
				let e = Ye();
				return (
					e && e.getEntriesByType && e.getEntriesByType('navigation').length > 0
				);
			}),
			(t.prototype.isPerformanceTimingSupported = function () {
				let e = Ye();
				return e && e.timing;
			}),
			(t.prototype.isPerformanceTimingDataReady = function () {
				let e = Ye(),
					r = e ? e.timing : 0;
				return (
					r &&
					r.domainLookupStart > 0 &&
					r.navigationStart > 0 &&
					r.responseStart > 0 &&
					r.requestStart > 0 &&
					r.loadEventEnd > 0 &&
					r.responseEnd > 0 &&
					r.connectEnd > 0 &&
					r.domLoading > 0
				);
			}),
			(t.prototype.shouldCollectDuration = function () {
				for (var e = [], r = 0; r < arguments.length; r++) {
					e[r] = arguments[r];
				}
				let n = Ue() || {},
					i = [
						'googlebot',
						'adsbot-google',
						'apis-google',
						'mediapartners-google',
					],
					a = n.userAgent,
					o = false;
				if (a) {
					for (var c = 0; c < i.length; c++) {
						o = o || a.toLowerCase().indexOf(i[c]) !== -1;
					}
				}
				if (o) {
					return false;
				}
				for (var c = 0; c < e.length; c++) {
					if (e[c] < 0 || e[c] >= this.MAX_DURATION_ALLOWED) {
						return false;
					}
				}
				return true;
			}),
			t
		);
	})();
});
function Pn(t, e) {
	t && t.dispatchEvent && e && t.dispatchEvent(e);
}
let uc;
let Za;
let bn;
let lc;
let fc = C(() => {
	ne();
	xe();
	J();
	ic();
	oc();
	cc();
	Te();
	(uc = 'duration'), (Za = 'event');
	(bn = (function (t) {
		H(e, t);
		function e() {
			let r = t.call(this) || this;
			(r.identifier = yi), (r.priority = 180), (r.autoRoutePVDelay = 500);
			let n,
				i,
				a,
				o = 0,
				c,
				s;
			return (
				W(e, r, function (u, l) {
					let f = et(true);
					(c = (f && f.href) || ''),
						(u.getCookieMgr = function () {
							return cr(u.core);
						}),
						(u.processTelemetry = function (p, v) {
							ct(
								u.core,
								function () {
									return u.identifier + ':processTelemetry';
								},
								function () {
									let y = false,
										w = u._telemetryInitializers.length;
									v = u._getTelCtx(v);
									for (let L = 0; L < w; ++L) {
										let F = u._telemetryInitializers[L];
										if (F) {
											try {
												if (F.apply(null, [p]) === false) {
													y = true;
													break;
												}
											} catch (Y) {
												v.diagLog().throwInternal(
													S.CRITICAL,
													h.TelemetryInitializerFailed,
													'One of telemetry initializers failed, telemetry item will not be sent: ' +
														G(Y),
													{ exception: O(Y) },
													true
												);
											}
										}
									}
									y || u.processNext(p, v);
								},
								function () {
									return { item: p };
								},
								!p.sync
							);
						}),
						(u.trackEvent = function (p, v) {
							try {
								let y = rt.create(
									p,
									Be.dataType,
									Be.envelopeType,
									u.diagLog(),
									v
								);
								u.core.track(y);
							} catch (w) {
								u.diagLog().throwInternal(
									S.WARNING,
									h.TrackTraceFailed,
									'trackTrace failed, trace will not be collected: ' + G(w),
									{ exception: O(w) }
								);
							}
						}),
						(u.startTrackEvent = function (p) {
							try {
								n.start(p);
							} catch (v) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.StartTrackEventFailed,
									'startTrackEvent failed, event will not be collected: ' +
										G(v),
									{ exception: O(v) }
								);
							}
						}),
						(u.stopTrackEvent = function (p, v, y) {
							try {
								n.stop(p, void 0, v);
							} catch (w) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.StopTrackEventFailed,
									'stopTrackEvent failed, event will not be collected: ' + G(w),
									{ exception: O(w) }
								);
							}
						}),
						(u.trackTrace = function (p, v) {
							try {
								let y = rt.create(
									p,
									$e.dataType,
									$e.envelopeType,
									u.diagLog(),
									v
								);
								u.core.track(y);
							} catch (w) {
								u.diagLog().throwInternal(
									S.WARNING,
									h.TrackTraceFailed,
									'trackTrace failed, trace will not be collected: ' + G(w),
									{ exception: O(w) }
								);
							}
						}),
						(u.trackMetric = function (p, v) {
							try {
								let y = rt.create(
									p,
									Ve.dataType,
									Ve.envelopeType,
									u.diagLog(),
									v
								);
								u.core.track(y);
							} catch (w) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.TrackMetricFailed,
									'trackMetric failed, metric will not be collected: ' + G(w),
									{ exception: O(w) }
								);
							}
						}),
						(u.trackPageView = function (p, v) {
							try {
								let y = p || {};
								u._pageViewManager.trackPageView(
									y,
									yt({}, y.properties, y.measurements, v)
								),
									u.config.autoTrackPageVisitTime &&
										u._pageVisitTimeManager.trackPreviousPageVisit(
											y.name,
											y.uri
										);
							} catch (w) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.TrackPVFailed,
									'trackPageView failed, page view will not be collected: ' +
										G(w),
									{ exception: O(w) }
								);
							}
						}),
						(u.sendPageViewInternal = function (p, v, y) {
							let w = Ne();
							w && (p.refUri = p.refUri === void 0 ? w.referrer : p.refUri);
							let L = rt.create(
								p,
								Fe.dataType,
								Fe.envelopeType,
								u.diagLog(),
								v,
								y
							);
							u.core.track(L), (o = 0);
						}),
						(u.sendPageViewPerformanceInternal = function (p, v, y) {
							let w = rt.create(
								p,
								Ze.dataType,
								Ze.envelopeType,
								u.diagLog(),
								v,
								y
							);
							u.core.track(w);
						}),
						(u.trackPageViewPerformance = function (p, v) {
							try {
								u._pageViewPerformanceManager.populatePageViewPerformanceEvent(
									p
								),
									u.sendPageViewPerformanceInternal(p, v);
							} catch (y) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.TrackPVFailed,
									'trackPageViewPerformance failed, page view will not be collected: ' +
										G(y),
									{ exception: O(y) }
								);
							}
						}),
						(u.startTrackPage = function (p) {
							try {
								if (typeof p !== 'string') {
									let v = Ne();
									p = (v && v.title) || '';
								}
								i.start(p);
							} catch (y) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.StartTrackFailed,
									'startTrackPage failed, page view may not be collected: ' +
										G(y),
									{ exception: O(y) }
								);
							}
						}),
						(u.stopTrackPage = function (p, v, y, w) {
							try {
								if (typeof p !== 'string') {
									let L = Ne();
									p = (L && L.title) || '';
								}
								if (typeof v !== 'string') {
									let F = et();
									v = (F && F.href) || '';
								}
								i.stop(p, v, y, w),
									u.config.autoTrackPageVisitTime &&
										u._pageVisitTimeManager.trackPreviousPageVisit(p, v);
							} catch (Y) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.StopTrackFailed,
									'stopTrackPage failed, page view will not be collected: ' +
										G(Y),
									{ exception: O(Y) }
								);
							}
						}),
						(u.sendExceptionInternal = function (p, v, y) {
							let w = p.exception || p.error || new Error(le),
								L = new he(
									u.diagLog(),
									w,
									p.properties || v,
									p.measurements,
									p.severityLevel,
									p.id
								).toInterface(),
								F = rt.create(
									L,
									he.dataType,
									he.envelopeType,
									u.diagLog(),
									v,
									y
								);
							u.core.track(F);
						}),
						(u.trackException = function (p, v) {
							try {
								u.sendExceptionInternal(p, v);
							} catch (y) {
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.TrackExceptionFailed,
									'trackException failed, exception will not be collected: ' +
										G(y),
									{ exception: O(y) }
								);
							}
						}),
						(u._onerror = function (p) {
							let v = p && p.error,
								y = p && p.evt;
							try {
								if (!y) {
									let w = Ct();
									w && (y = w[Za]);
								}
								let L = (p && p.url) || (Ne() || {}).URL,
									F =
										p.errorSrc ||
										'window.onerror@' +
											L +
											':' +
											(p.lineNumber || 0) +
											':' +
											(p.columnNumber || 0),
									Y = {
										errorSrc: F,
										url: L,
										lineNumber: p.lineNumber || 0,
										columnNumber: p.columnNumber || 0,
										message: p.message,
									};
								un(p.message, p.url, p.lineNumber, p.columnNumber, p.error)
									? b(
											he.CreateAutoException(
												"Script error: The browser's same-origin policy prevents us from getting the details of this exception. Consider using the 'crossorigin' attribute.",
												L,
												p.lineNumber || 0,
												p.columnNumber || 0,
												v,
												y,
												null,
												F
											),
											Y
									  )
									: (p.errorSrc || (p.errorSrc = F),
									  u.trackException(
											{ exception: p, severityLevel: _t.Error },
											Y
									  ));
							} catch (X) {
								let Se = v ? v.name + ', ' + v.message : 'null';
								u.diagLog().throwInternal(
									S.CRITICAL,
									h.ExceptionWhileLoggingError,
									'_onError threw exception while logging error, error will not be collected: ' +
										G(X),
									{ exception: O(X), errorString: Se }
								);
							}
						}),
						(u.addTelemetryInitializer = function (p) {
							u._telemetryInitializers.push(p);
						}),
						(u.initialize = function (p, v, y, w) {
							if (!u.isInitialized()) {
								if (x(v)) {
									throw Error('Error initializing');
								}
								l.initialize(p, v, y, w), u.setInitialized(false);
								let L = u._getTelCtx(),
									F = u.identifier;
								u.config = L.getExtCfg(F);
								let Y = e.getDefaultConfig(p);
								Y !== void 0 &&
									Q(Y, function (D, z) {
										(u.config[D] = L.getConfig(F, D, z)),
											u.config[D] === void 0 && (u.config[D] = z);
									}),
									u.config.isStorageUseDisabled && pn();
								let Se = {
									instrumentationKey: function () {
										return p.instrumentationKey;
									},
									accountId: function () {
										return u.config.accountId || p.accountId;
									},
									sessionRenewalMs: function () {
										return u.config.sessionRenewalMs || p.sessionRenewalMs;
									},
									sessionExpirationMs: function () {
										return (
											u.config.sessionExpirationMs || p.sessionExpirationMs
										);
									},
									sampleRate: function () {
										return u.config.samplingPercentage || p.samplingPercentage;
									},
									sdkExtension: function () {
										return u.config.sdkExtension || p.sdkExtension;
									},
									isBrowserLinkTrackingEnabled: function () {
										return (
											u.config.isBrowserLinkTrackingEnabled ||
											p.isBrowserLinkTrackingEnabled
										);
									},
									appId: function () {
										return u.config.appId || p.appId;
									},
								};
								(u._pageViewPerformanceManager = new sc(u.core)),
									(u._pageViewManager = new nc(
										r,
										u.config.overridePageViewDuration,
										u.core,
										u._pageViewPerformanceManager
									)),
									(u._pageVisitTimeManager = new ac(
										u.diagLog(),
										function (D, z, U) {
											return m(D, z, U);
										}
									)),
									(u._telemetryInitializers = u._telemetryInitializers || []),
									I(Se),
									(n = new lc(u.diagLog(), 'trackEvent')),
									(n.action = function (D, z, U, q) {
										q || (q = {}),
											(q[uc] = U.toString()),
											u.trackEvent({ name: D, properties: q });
									}),
									(i = new lc(u.diagLog(), 'trackPageView')),
									(i.action = function (D, z, U, q, $) {
										x(q) && (q = {}), (q[uc] = U.toString());
										let ie = {
											name: D,
											uri: z,
											properties: q,
											measurements: $,
										};
										u.sendPageViewInternal(ie, q);
									});
								let X = Ct(),
									me = Xi(),
									De = et(true),
									pt = r;
								if (
									u.config.disableExceptionTracking === false &&
									!u.config.autoExceptionInstrumented &&
									X
								) {
									let at = 'onerror',
										dt = X[at];
									(X.onerror = function (D, z, U, q, $) {
										let ie = X[Za],
											Ht = dt && dt(D, z, U, q, $);
										return (
											Ht !== true &&
												pt._onerror(he.CreateAutoException(D, z, U, q, $, ie)),
											Ht
										);
									}),
										(u.config.autoExceptionInstrumented = true);
								}
								if (
									u.config.disableExceptionTracking === false &&
									u.config.enableUnhandledPromiseRejectionTracking === true &&
									!u.config.autoUnhandledPromiseInstrumented &&
									X
								) {
									let d = 'onunhandledrejection',
										T = X[d];
									(X[d] = function (D) {
										let z = X[Za],
											U = T && T.call(X, D);
										return (
											U !== true &&
												pt._onerror(
													he.CreateAutoException(
														D.reason.toString(),
														De ? De.href : '',
														0,
														0,
														D,
														z
													)
												),
											U
										);
									}),
										(u.config.autoUnhandledPromiseInstrumented = true);
								}
								if (
									u.config.enableAutoRouteTracking === true &&
									me &&
									j(me.pushState) &&
									j(me.replaceState) &&
									X &&
									typeof Event !== 'undefined'
								) {
									let A = r;
									R(y, function (D) {
										D.identifier === Ot && (a = D);
									}),
										(me.pushState = (function (D) {
											return function () {
												let U = D.apply(this, arguments);
												return (
													Pn(X, Lt(A.config.namePrefix + 'pushState')),
													Pn(X, Lt(A.config.namePrefix + 'locationchange')),
													U
												);
											};
										})(me.pushState)),
										(me.replaceState = (function (D) {
											return function () {
												let U = D.apply(this, arguments);
												return (
													Pn(X, Lt(A.config.namePrefix + 'replaceState')),
													Pn(X, Lt(A.config.namePrefix + 'locationchange')),
													U
												);
											};
										})(me.replaceState)),
										X.addEventListener &&
											(X.addEventListener(
												A.config.namePrefix + 'popstate',
												function () {
													Pn(X, Lt(A.config.namePrefix + 'locationchange'));
												}
											),
											X.addEventListener(
												A.config.namePrefix + 'locationchange',
												function () {
													if (a && a.context && a.context.telemetryTrace) {
														a.context.telemetryTrace.traceID = He();
														let D = '_unknown_';
														De &&
															De.pathname &&
															(D = De.pathname + (De.hash || '')),
															(a.context.telemetryTrace.name = D);
													}
													s && (c = s),
														(s = (De && De.href) || ''),
														setTimeout(
															function (z) {
																A.trackPageView({
																	refUri: z,
																	properties: { duration: 0 },
																});
															}.bind(r, c),
															A.autoRoutePVDelay
														);
												}
											));
								}
								u.setInitialized(true);
							}
						});
					function m(p, v, y) {
						let w = { PageName: p, PageUrl: v };
						u.trackMetric(
							{
								name: 'PageVisitTime',
								average: y,
								max: y,
								min: y,
								sampleCount: 1,
							},
							w
						);
					}
					function I(p) {
						if (!p.isBrowserLinkTrackingEnabled()) {
							let v = ['/browserLinkSignalR/', '/__browserLink/'],
								y = function (w) {
									if (w.baseType === qe.dataType) {
										let L = w.baseData;
										if (L) {
											for (let F = 0; F < v.length; F++) {
												if (L.target && L.target.indexOf(v[F]) >= 0) {
													return false;
												}
											}
										}
									}
									return true;
								};
							E(y);
						}
					}
					function E(p) {
						u._telemetryInitializers.push(p);
					}
					function b(p, v) {
						let y = rt.create(p, he.dataType, he.envelopeType, u.diagLog(), v);
						u.core.track(y);
					}
				}),
				r
			);
		}
		return (
			(e.getDefaultConfig = function (r) {
				return (
					r || (r = {}),
					(r.sessionRenewalMs = 30 * 60 * 1e3),
					(r.sessionExpirationMs = 24 * 60 * 60 * 1e3),
					(r.disableExceptionTracking = ee(r.disableExceptionTracking)),
					(r.autoTrackPageVisitTime = ee(r.autoTrackPageVisitTime)),
					(r.overridePageViewDuration = ee(r.overridePageViewDuration)),
					(r.enableUnhandledPromiseRejectionTracking = ee(
						r.enableUnhandledPromiseRejectionTracking
					)),
					(isNaN(r.samplingPercentage) ||
						r.samplingPercentage <= 0 ||
						r.samplingPercentage >= 100) &&
						(r.samplingPercentage = 100),
					(r.isStorageUseDisabled = ee(r.isStorageUseDisabled)),
					(r.isBrowserLinkTrackingEnabled = ee(r.isBrowserLinkTrackingEnabled)),
					(r.enableAutoRouteTracking = ee(r.enableAutoRouteTracking)),
					(r.namePrefix = r.namePrefix || ''),
					(r.enableDebug = ee(r.enableDebug)),
					(r.disableFlushOnBeforeUnload = ee(r.disableFlushOnBeforeUnload)),
					(r.disableFlushOnUnload = ee(
						r.disableFlushOnUnload,
						r.disableFlushOnBeforeUnload
					)),
					r
				);
			}),
			(e.Version = '2.6.4'),
			e
		);
	})(tt)),
		(lc = (function () {
			function t(e, r) {
				let n = this,
					i = {};
				(n.start = function (a) {
					typeof i[a] !== 'undefined' &&
						e.throwInternal(
							S.WARNING,
							h.StartCalledMoreThanOnce,
							'start was called more than once for this event without calling stop.',
							{ name: a, key: a },
							true
						),
						(i[a] = +new Date());
				}),
					(n.stop = function (a, o, c, s) {
						let u = i[a];
						if (isNaN(u)) {
							e.throwInternal(
								S.WARNING,
								h.StopCalledWithoutStart,
								'stop was called without a corresponding start.',
								{ name: a, key: a },
								true
							);
						} else {
							let l = +new Date(),
								f = ve(u, l);
							n.action(a, o, f, c, s);
						}
						delete i[a], (i[a] = void 0);
					});
			}
			return t;
		})());
});
let Qa = C(() => {
	fc();
});
let pc;
let dc;
let mc = C(() => {
	xe();
	J();
	Te();
	(pc = (function () {
		function t(e) {
			let r = [];
			W(t, this, function (n) {
				(n.enqueue = function (i) {
					r.push(i);
				}),
					(n.count = function () {
						return r.length;
					}),
					(n.clear = function () {
						r.length = 0;
					}),
					(n.getItems = function () {
						return r.slice(0);
					}),
					(n.batchPayloads = function (i) {
						if (i && i.length > 0) {
							let a = e.emitLineDelimitedJson()
								? i.join(`
`)
								: '[' + i.join(',') + ']';
							return a;
						}
						return null;
					}),
					(n.markAsSent = function (i) {
						n.clear();
					}),
					(n.clearSent = function (i) {});
			});
		}
		return t;
	})()),
		(dc = (function () {
			function t(e, r) {
				let n = false,
					i;
				W(t, this, function (a) {
					let o = u(t.BUFFER_KEY),
						c = u(t.SENT_BUFFER_KEY);
					(i = o.concat(c)),
						i.length > t.MAX_BUFFER_SIZE && (i.length = t.MAX_BUFFER_SIZE),
						l(t.SENT_BUFFER_KEY, []),
						l(t.BUFFER_KEY, i),
						(a.enqueue = function (f) {
							if (i.length >= t.MAX_BUFFER_SIZE) {
								n ||
									(e.throwInternal(
										S.WARNING,
										h.SessionStorageBufferFull,
										'Maximum buffer size reached: ' + i.length,
										true
									),
									(n = true));
								return;
							}
							i.push(f), l(t.BUFFER_KEY, i);
						}),
						(a.count = function () {
							return i.length;
						}),
						(a.clear = function () {
							(i = []),
								l(t.BUFFER_KEY, []),
								l(t.SENT_BUFFER_KEY, []),
								(n = false);
						}),
						(a.getItems = function () {
							return i.slice(0);
						}),
						(a.batchPayloads = function (f) {
							if (f && f.length > 0) {
								let m = r.emitLineDelimitedJson()
									? f.join(`
`)
									: '[' + f.join(',') + ']';
								return m;
							}
							return null;
						}),
						(a.markAsSent = function (f) {
							(i = s(f, i)), l(t.BUFFER_KEY, i);
							let m = u(t.SENT_BUFFER_KEY);
							m instanceof Array &&
								f instanceof Array &&
								((m = m.concat(f)),
								m.length > t.MAX_BUFFER_SIZE &&
									(e.throwInternal(
										S.CRITICAL,
										h.SessionStorageBufferFull,
										'Sent buffer reached its maximum size: ' + m.length,
										true
									),
									(m.length = t.MAX_BUFFER_SIZE)),
								l(t.SENT_BUFFER_KEY, m));
						}),
						(a.clearSent = function (f) {
							let m = u(t.SENT_BUFFER_KEY);
							(m = s(f, m)), l(t.SENT_BUFFER_KEY, m);
						});
					function s(f, m) {
						let I = [];
						return (
							R(m, function (E) {
								!j(E) && Nt(f, E) === -1 && I.push(E);
							}),
							I
						);
					}
					function u(f) {
						let m = f;
						try {
							m = r.namePrefix && r.namePrefix() ? r.namePrefix() + '_' + m : m;
							let I = $t(e, m);
							if (I) {
								let E = Pe().parse(I);
								if ((_(E) && (E = Pe().parse(E)), E && Re(E))) {
									return E;
								}
							}
						} catch (b) {
							e.throwInternal(
								S.CRITICAL,
								h.FailedToRestoreStorageBuffer,
								' storage key: ' + m + ', ' + G(b),
								{ exception: O(b) }
							);
						}
						return [];
					}
					function l(f, m) {
						let I = f;
						try {
							I = r.namePrefix && r.namePrefix() ? r.namePrefix() + '_' + I : I;
							let E = JSON.stringify(m);
							Zt(e, I, E);
						} catch (b) {
							Zt(e, I, JSON.stringify([])),
								e.throwInternal(
									S.WARNING,
									h.FailedToSetStorageBuffer,
									' storage key: ' + I + ', ' + G(b) + '. Buffer cleared',
									{ exception: O(b) }
								);
						}
					}
				});
			}
			return (
				(t.BUFFER_KEY = 'AI_buffer'),
				(t.SENT_BUFFER_KEY = 'AI_sentBuffer'),
				(t.MAX_BUFFER_SIZE = 2e3),
				t
			);
		})());
});
function ye(t, e, r) {
	return K(t, e, r, Pr);
}
let eo;
let se;
let ke;
let gc;
let fe;
let vc;
let to;
let hc;
let xc;
let yc;
let Sc;
let Cc;
let Ic = C(() => {
	ne();
	xe();
	J();
	(eo = 'baseType'), (se = 'baseData'), (ke = 'properties'), (gc = 'true');
	(fe = (function () {
		function t() {}
		return (
			(t.extractPropsAndMeasurements = function (e, r, n) {
				x(e) ||
					Q(e, function (i, a) {
						ir(a)
							? (n[i] = a)
							: _(a)
							? (r[i] = a)
							: vt() && (r[i] = Pe().stringify(a));
					});
			}),
			(t.createEnvelope = function (e, r, n, i) {
				let a = new Tn(e, i, r);
				ye(a, 'sampleRate', n[lr]),
					(n[se] || {}).startTime && (a.time = Me(n[se].startTime)),
					(a.iKey = n.iKey);
				let o = n.iKey.replace(/-/g, '');
				return (
					(a.name = a.name.replace('{0}', o)),
					t.extractPartAExtensions(n, a),
					(n.tags = n.tags || []),
					Kn(a)
				);
			}),
			(t.extractPartAExtensions = function (e, r) {
				let n = (r.tags = r.tags || {}),
					i = (e.ext = e.ext || {}),
					a = (e.tags = e.tags || []),
					o = i.user;
				o &&
					(ye(n, re.userAuthUserId, o.authId),
					ye(n, re.userId, o.id || o.localId));
				let c = i.app;
				c && ye(n, re.sessionId, c.sesId);
				let s = i.device;
				s &&
					(ye(n, re.deviceId, s.id || s.localId),
					ye(n, re.deviceType, s.deviceClass),
					ye(n, re.deviceIp, s.ip),
					ye(n, re.deviceModel, s.model),
					ye(n, re.deviceType, s.deviceType));
				let u = e.ext.web;
				if (u) {
					ye(n, re.deviceLanguage, u.browserLang),
						ye(n, re.deviceBrowserVersion, u.browserVer),
						ye(n, re.deviceBrowser, u.browser);
					let l = (r.data = r.data || {}),
						f = (l[se] = l[se] || {}),
						m = (f[ke] = f[ke] || {});
					ye(m, 'domain', u.domain),
						ye(m, 'isManual', u.isManual ? gc : null),
						ye(m, 'screenRes', u.screenRes),
						ye(m, 'userConsent', u.userConsent ? gc : null);
				}
				let I = i.os;
				I && ye(n, re.deviceOS, I.name);
				let E = i.trace;
				E &&
					(ye(n, re.operationParentId, E.parentID),
					ye(n, re.operationName, E.name),
					ye(n, re.operationId, E.traceID));
				for (var b = {}, p = a.length - 1; p >= 0; p--) {
					let v = a[p];
					Q(v, function (w, L) {
						b[w] = L;
					}),
						a.splice(p, 1);
				}
				Q(a, function (w, L) {
					b[w] = L;
				});
				let y = yt({}, n, b);
				y[re.internalSdkVersion] ||
					(y[re.internalSdkVersion] = 'javascript:' + t.Version),
					(r.tags = Kn(y));
			}),
			(t.prototype.Init = function (e, r) {
				(this._logger = e),
					x(r[se]) &&
						this._logger.throwInternal(
							S.CRITICAL,
							h.TelemetryEnvelopeInvalid,
							'telemetryItem.baseData cannot be null.'
						);
			}),
			(t.Version = '2.6.4'),
			t
		);
	})()),
		(vc = (function (t) {
			H(e, t);
			function e() {
				return (t !== null && t.apply(this, arguments)) || this;
			}
			return (
				(e.prototype.Create = function (r, n) {
					t.prototype.Init.call(this, r, n);
					let i = n[se].measurements || {},
						a = n[se][ke] || {};
					fe.extractPropsAndMeasurements(n.data, a, i);
					let o = n[se];
					if (x(o)) {
						return r.warnToConsole('Invalid input for dependency data'), null;
					}
					let c = o[ke] && o[ke][Fr] ? o[ke][Fr] : 'GET',
						s = new qe(
							r,
							o.id,
							o.target,
							o.name,
							o.duration,
							o.success,
							o.responseCode,
							c,
							o.type,
							o.correlationContext,
							a,
							i
						),
						u = new xt(qe.dataType, s);
					return fe.createEnvelope(r, qe.envelopeType, n, u);
				}),
				(e.DependencyEnvelopeCreator = new e()),
				e
			);
		})(fe)),
		(to = (function (t) {
			H(e, t);
			function e() {
				return (t !== null && t.apply(this, arguments)) || this;
			}
			return (
				(e.prototype.Create = function (r, n) {
					t.prototype.Init.call(this, r, n);
					let i = {},
						a = {};
					n[eo] !== Be.dataType && (i.baseTypeSource = n[eo]),
						n[eo] === Be.dataType
							? ((i = n[se][ke] || {}), (a = n[se].measurements || {}))
							: n[se] && fe.extractPropsAndMeasurements(n[se], i, a),
						fe.extractPropsAndMeasurements(n.data, i, a);
					let o = n[se].name,
						c = new Be(r, o, i, a),
						s = new xt(Be.dataType, c);
					return fe.createEnvelope(r, Be.envelopeType, n, s);
				}),
				(e.EventEnvelopeCreator = new e()),
				e
			);
		})(fe)),
		(hc = (function (t) {
			H(e, t);
			function e() {
				return (t !== null && t.apply(this, arguments)) || this;
			}
			return (
				(e.prototype.Create = function (r, n) {
					t.prototype.Init.call(this, r, n);
					let i = n[se].measurements || {},
						a = n[se][ke] || {};
					fe.extractPropsAndMeasurements(n.data, a, i);
					let o = n[se],
						c = he.CreateFromInterface(r, o, a, i),
						s = new xt(he.dataType, c);
					return fe.createEnvelope(r, he.envelopeType, n, s);
				}),
				(e.ExceptionEnvelopeCreator = new e()),
				e
			);
		})(fe)),
		(xc = (function (t) {
			H(e, t);
			function e() {
				return (t !== null && t.apply(this, arguments)) || this;
			}
			return (
				(e.prototype.Create = function (r, n) {
					t.prototype.Init.call(this, r, n);
					let i = n[se],
						a = i[ke] || {},
						o = i.measurements || {};
					fe.extractPropsAndMeasurements(n.data, a, o);
					let c = new Ve(
							r,
							i.name,
							i.average,
							i.sampleCount,
							i.min,
							i.max,
							a,
							o
						),
						s = new xt(Ve.dataType, c);
					return fe.createEnvelope(r, Ve.envelopeType, n, s);
				}),
				(e.MetricEnvelopeCreator = new e()),
				e
			);
		})(fe)),
		(yc = (function (t) {
			H(e, t);
			function e() {
				return (t !== null && t.apply(this, arguments)) || this;
			}
			return (
				(e.prototype.Create = function (r, n) {
					t.prototype.Init.call(this, r, n);
					let i = 'duration',
						a,
						o = n[se];
					!x(o) && !x(o[ke]) && !x(o[ke][i])
						? ((a = o[ke][i]), delete o[ke][i])
						: !x(n.data) &&
						  !x(n.data[i]) &&
						  ((a = n.data[i]), delete n.data[i]);
					let c = n[se],
						s;
					((n.ext || {}).trace || {}).traceID && (s = n.ext.trace.traceID);
					let u = c.id || s,
						l = c.name,
						f = c.uri,
						m = c[ke] || {},
						I = c.measurements || {};
					if (
						(x(c.refUri) || (m.refUri = c.refUri),
						x(c.pageType) || (m.pageType = c.pageType),
						x(c.isLoggedIn) || (m.isLoggedIn = c.isLoggedIn.toString()),
						!x(c[ke]))
					) {
						let E = c[ke];
						Q(E, function (v, y) {
							m[v] = y;
						});
					}
					fe.extractPropsAndMeasurements(n.data, m, I);
					let b = new Fe(r, l, f, a, m, I, u),
						p = new xt(Fe.dataType, b);
					return fe.createEnvelope(r, Fe.envelopeType, n, p);
				}),
				(e.PageViewEnvelopeCreator = new e()),
				e
			);
		})(fe)),
		(Sc = (function (t) {
			H(e, t);
			function e() {
				return (t !== null && t.apply(this, arguments)) || this;
			}
			return (
				(e.prototype.Create = function (r, n) {
					t.prototype.Init.call(this, r, n);
					let i = n[se],
						a = i.name,
						o = i.uri || i.url,
						c = i[ke] || {},
						s = i.measurements || {};
					fe.extractPropsAndMeasurements(n.data, c, s);
					let u = new Ze(r, a, o, void 0, c, s, i),
						l = new xt(Ze.dataType, u);
					return fe.createEnvelope(r, Ze.envelopeType, n, l);
				}),
				(e.PageViewPerformanceEnvelopeCreator = new e()),
				e
			);
		})(fe)),
		(Cc = (function (t) {
			H(e, t);
			function e() {
				return (t !== null && t.apply(this, arguments)) || this;
			}
			return (
				(e.prototype.Create = function (r, n) {
					t.prototype.Init.call(this, r, n);
					let i = n[se].message,
						a = n[se].severityLevel,
						o = n[se][ke] || {},
						c = n[se].measurements || {};
					fe.extractPropsAndMeasurements(n.data, o, c);
					let s = new $e(r, i, a, o, c),
						u = new xt($e.dataType, s);
					return fe.createEnvelope(r, $e.envelopeType, n, u);
				}),
				(e.TraceEnvelopeCreator = new e()),
				e
			);
		})(fe));
});
let Tc;
let Ec = C(() => {
	J();
	Te();
	Tc = (function () {
		function t(e) {
			W(t, this, function (r) {
				r.serialize = function (o) {
					let c = n(o, 'root');
					try {
						return Pe().stringify(c);
					} catch (s) {
						e.throwInternal(
							S.CRITICAL,
							h.CannotSerializeObject,
							s && j(s.toString) ? s.toString() : 'Error serializing object',
							null,
							true
						);
					}
				};
				function n(o, c) {
					let s = '__aiCircularRefCheck',
						u = {};
					if (!o) {
						return (
							e.throwInternal(
								S.CRITICAL,
								h.CannotSerializeObject,
								'cannot serialize object because it is null or undefined',
								{ name: c },
								true
							),
							u
						);
					}
					if (o[s]) {
						return (
							e.throwInternal(
								S.WARNING,
								h.CircularReferenceDetected,
								'Circular reference detected while serializing object',
								{ name: c },
								true
							),
							u
						);
					}
					if (!o.aiDataContract) {
						if (c === 'measurements') {
							u = a(o, 'number', c);
						} else if (c === 'properties') {
							u = a(o, 'string', c);
						} else if (c === 'tags') {
							u = a(o, 'string', c);
						} else if (Re(o)) {
							u = i(o, c);
						} else {
							e.throwInternal(
								S.WARNING,
								h.CannotSerializeObjectNonSerializable,
								'Attempting to serialize an object which does not implement ISerializable',
								{ name: c },
								true
							);
							try {
								Pe().stringify(o), (u = o);
							} catch (l) {
								e.throwInternal(
									S.CRITICAL,
									h.CannotSerializeObject,
									l && j(l.toString)
										? l.toString()
										: 'Error serializing object',
									null,
									true
								);
							}
						}
						return u;
					}
					return (
						(o[s] = true),
						Q(o.aiDataContract, function (l, f) {
							let m = j(f) ? f() & 1 : f & 1,
								I = j(f) ? f() & 4 : f & 4,
								E = f & 2,
								b = o[l] !== void 0,
								p = st(o[l]) && o[l] !== null;
							if (m && !b && !E) {
								e.throwInternal(
									S.CRITICAL,
									h.MissingRequiredFieldSpecification,
									'Missing required field specification. The field is required but not present on source',
									{ field: l, name: c }
								);
							} else if (!I) {
								let v = void 0;
								p ? (E ? (v = i(o[l], l)) : (v = n(o[l], l))) : (v = o[l]),
									v !== void 0 && (u[l] = v);
							}
						}),
						delete o[s],
						u
					);
				}
				function i(o, c) {
					let s;
					if (o) {
						if (!Re(o)) {
							e.throwInternal(
								S.CRITICAL,
								h.ItemNotInArray,
								`This field was specified as an array in the contract but the item is not an array.\r
`,
								{ name: c },
								true
							);
						} else {
							s = [];
							for (let u = 0; u < o.length; u++) {
								let l = o[u],
									f = n(l, c + '[' + u + ']');
								s.push(f);
							}
						}
					}
					return s;
				}
				function a(o, c, s) {
					let u;
					return (
						o &&
							((u = {}),
							Q(o, function (l, f) {
								if (c === 'string') {
									f === void 0
										? (u[l] = 'undefined')
										: f === null
										? (u[l] = 'null')
										: f.toString
										? (u[l] = f.toString())
										: (u[l] = 'invalid field: toString() is not defined.');
								} else if (c === 'number') {
									if (f === void 0) {
										u[l] = 'undefined';
									} else if (f === null) {
										u[l] = 'null';
									} else {
										let m = parseFloat(f);
										isNaN(m) ? (u[l] = 'NaN') : (u[l] = m);
									}
								} else {
									(u[l] = 'invalid field: ' + s + ' is of unknown type.'),
										e.throwInternal(S.CRITICAL, u[l], null, true);
								}
							})),
						u
					);
				}
			});
		}
		return t;
	})();
});
let pl;
let ro;
let wc = C(() => {
	J();
	Te();
	(pl = (function () {
		function t() {
			let e = Ct(),
				r = Ne(),
				n = false,
				i = true;
			W(t, this, function (a) {
				try {
					if (
						(e &&
							Jt.Attach(e, 'online', s) &&
							(Jt.Attach(e, 'offline', u), (n = true)),
						r)
					) {
						let o = r.body || r;
						pe(o.ononline) || ((o.ononline = s), (o.onoffline = u), (n = true));
					}
					if (n) {
						let c = Ue();
						c && !x(c.onLine) && (i = c.onLine);
					}
				} catch (l) {
					n = false;
				}
				(a.isListening = n),
					(a.isOnline = function () {
						let l = true,
							f = Ue();
						return n ? (l = i) : f && !x(f.onLine) && (l = f.onLine), l;
					}),
					(a.isOffline = function () {
						return !a.isOnline();
					});
				function s() {
					i = true;
				}
				function u() {
					i = false;
				}
			});
		}
		return (t.Offline = new t()), t;
	})()),
		(ro = pl.Offline);
});
let Pc;
let bc = C(() => {
	Pc = (function () {
		function t() {}
		return (
			(t.prototype.getHashCodeScore = function (e) {
				let r = this.getHashCode(e) / t.INT_MAX_VALUE;
				return r * 100;
			}),
			(t.prototype.getHashCode = function (e) {
				if (e === '') {
					return 0;
				}
				for (; e.length < t.MIN_INPUT_LENGTH; ) {
					e = e.concat(e);
				}
				for (var r = 5381, n = 0; n < e.length; ++n) {
					(r = (r << 5) + r + e.charCodeAt(n)), (r = r & r);
				}
				return Math.abs(r);
			}),
			(t.INT_MAX_VALUE = 2147483647),
			(t.MIN_INPUT_LENGTH = 8),
			t
		);
	})();
});
let Dc;
let Ac = C(() => {
	bc();
	xe();
	Dc = (function () {
		function t() {
			(this.hashCodeGeneragor = new Pc()), (this.keys = new hr());
		}
		return (
			(t.prototype.getSamplingScore = function (e) {
				let r = 0;
				return (
					e.tags && e.tags[this.keys.userId]
						? (r = this.hashCodeGeneragor.getHashCodeScore(
								e.tags[this.keys.userId]
						  ))
						: e.ext && e.ext.user && e.ext.user.id
						? (r = this.hashCodeGeneragor.getHashCodeScore(e.ext.user.id))
						: e.tags && e.tags[this.keys.operationId]
						? (r = this.hashCodeGeneragor.getHashCodeScore(
								e.tags[this.keys.operationId]
						  ))
						: e.ext && e.ext.telemetryTrace && e.ext.telemetryTrace.traceID
						? (r = this.hashCodeGeneragor.getHashCodeScore(
								e.ext.telemetryTrace.traceID
						  ))
						: (r = Math.random() * 100),
					r
				);
			}),
			t
		);
	})();
});
let Nc;
let Fc = C(() => {
	Ac();
	xe();
	J();
	Nc = (function () {
		function t(e, r) {
			(this.INT_MAX_VALUE = 2147483647),
				(this._logger = r || kt(null)),
				(e > 100 || e < 0) &&
					(this._logger.throwInternal(
						S.WARNING,
						h.SampleRateOutOfRange,
						'Sampling rate is out of range (0..100). Sampling will be disabled, you may be sending too much data which may affect your AI service level.',
						{ samplingRate: e },
						true
					),
					(e = 100)),
				(this.sampleRate = e),
				(this.samplingScoreGenerator = new Dc());
		}
		return (
			(t.prototype.isSampledIn = function (e) {
				let r = this.sampleRate,
					n = false;
				return r == null || r >= 100 || e.baseType === Ve.dataType
					? true
					: ((n = this.samplingScoreGenerator.getSamplingScore(e) < r), n);
			}),
			t
		);
	})();
});
function Si(t) {
	try {
		return t.responseText;
	} catch (e) {}
	return null;
}
let Dn;
let kc = C(() => {
	ne();
	mc();
	Ic();
	Ec();
	xe();
	J();
	wc();
	Fc();
	Te();
	Dn = (function (t) {
		H(e, t);
		function e() {
			let r = t.call(this) || this;
			(r.priority = 1001),
				(r.identifier = _r),
				(r._XMLHttpRequestSupported = false);
			let n,
				i,
				a,
				o,
				c,
				s,
				u = {};
			return (
				W(e, r, function (l, f) {
					function m() {
						Ae('Method not implemented.');
					}
					(l.pause = m),
						(l.resume = m),
						(l.flush = function () {
							try {
								l.triggerSend(true, null, 1);
							} catch (d) {
								l.diagLog().throwInternal(
									S.CRITICAL,
									h.FlushFailed,
									'flush failed, telemetry will not be collected: ' + G(d),
									{ exception: O(d) }
								);
							}
						}),
						(l.onunloadFlush = function () {
							if (
								(l._senderConfig.onunloadDisableBeacon() === false ||
									l._senderConfig.isBeaconApiDisabled() === false) &&
								Nr()
							) {
								try {
									l.triggerSend(true, p, 2);
								} catch (d) {
									l.diagLog().throwInternal(
										S.CRITICAL,
										h.FailedToSendQueuedTelemetry,
										'failed to flush with beacon sender on page unload, telemetry will not be collected: ' +
											G(d),
										{ exception: O(d) }
									);
								}
							} else {
								l.flush();
							}
						}),
						(l.teardown = m),
						(l.addHeader = function (d, T) {
							u[d] = T;
						}),
						(l.initialize = function (d, T, A, D) {
							f.initialize(d, T, A, D);
							let z = l._getTelCtx(),
								U = l.identifier;
							(c = new Tc(T.logger)),
								(n = 0),
								(i = null),
								(a = 0),
								(l._sender = null),
								(s = 0);
							let q = e._getDefaultAppInsightsChannelConfig();
							if (
								((l._senderConfig = e._getEmptyAppInsightsChannelConfig()),
								Q(q, function (g, P) {
									l._senderConfig[g] = function () {
										return z.getConfig(U, g, P());
									};
								}),
								(l._buffer =
									l._senderConfig.enableSessionStorageBuffer() && wt()
										? new dc(l.diagLog(), l._senderConfig)
										: new pc(l._senderConfig)),
								(l._sample = new Nc(
									l._senderConfig.samplingPercentage(),
									l.diagLog()
								)),
								dt(d) ||
									l
										.diagLog()
										.throwInternal(
											S.CRITICAL,
											h.InvalidInstrumentationKey,
											'Invalid Instrumentation key ' + d.instrumentationKey
										),
								!Rr(l._senderConfig.endpointUrl()) &&
									l._senderConfig.customHeaders() &&
									l._senderConfig.customHeaders().length > 0 &&
									R(l._senderConfig.customHeaders(), function (g) {
										r.addHeader(g.header, g.value);
									}),
								!l._senderConfig.isBeaconApiDisabled() && Nr())
							) {
								l._sender = p;
							} else {
								let $ = we('XMLHttpRequest');
								if ($) {
									let ie = new $();
									'withCredentials' in ie
										? ((l._sender = v), (l._XMLHttpRequestSupported = true))
										: typeof XDomainRequest !== Oe && (l._sender = me);
								} else {
									let Ht = we('fetch');
									Ht && (l._sender = y);
								}
							}
						}),
						(l.processTelemetry = function (d, T) {
							T = l._getTelCtx(T);
							try {
								if (l._senderConfig.disableTelemetry()) {
									return;
								}
								if (!d) {
									T.diagLog().throwInternal(
										S.CRITICAL,
										h.CannotSendEmptyTelemetry,
										'Cannot send empty telemetry'
									);
									return;
								}
								if (d.baseData && !d.baseType) {
									T.diagLog().throwInternal(
										S.CRITICAL,
										h.InvalidEvent,
										'Cannot send telemetry without baseData and baseType'
									);
									return;
								}
								if ((d.baseType || (d.baseType = 'EventData'), !l._sender)) {
									T.diagLog().throwInternal(
										S.CRITICAL,
										h.SenderNotInitialized,
										'Sender was not initialized'
									);
									return;
								}
								if (I(d)) {
									d[lr] = l._sample.sampleRate;
								} else {
									T.diagLog().throwInternal(
										S.WARNING,
										h.TelemetrySampledAndNotSent,
										'Telemetry item was sampled out and not sent',
										{ SampleRate: l._sample.sampleRate }
									);
									return;
								}
								let A = e.constructEnvelope(
									d,
									l._senderConfig.instrumentationKey(),
									T.diagLog()
								);
								if (!A) {
									T.diagLog().throwInternal(
										S.CRITICAL,
										h.CreateEnvelopeError,
										'Unable to create an AppInsights envelope'
									);
									return;
								}
								let D = false;
								if (
									(d.tags &&
										d.tags[Ut] &&
										(R(d.tags[Ut], function ($) {
											try {
												$ &&
													$(A) === false &&
													((D = true),
													T.diagLog().warnToConsole(
														'Telemetry processor check returns false'
													));
											} catch (ie) {
												T.diagLog().throwInternal(
													S.CRITICAL,
													h.TelemetryInitializerFailed,
													'One of telemetry initializers failed, telemetry item will not be sent: ' +
														G(ie),
													{ exception: O(ie) },
													true
												);
											}
										}),
										delete d.tags[Ut]),
									D)
								) {
									return;
								}
								let z = c.serialize(A),
									U = l._buffer.getItems(),
									q = l._buffer.batchPayloads(U);
								q &&
									q.length + z.length > l._senderConfig.maxBatchSizeInBytes() &&
									l.triggerSend(true, null, 10),
									l._buffer.enqueue(z),
									Y();
							} catch ($) {
								T.diagLog().throwInternal(
									S.WARNING,
									h.FailedAddingTelemetryToBuffer,
									"Failed adding telemetry to the sender's buffer, some telemetry will be lost: " +
										G($),
									{ exception: O($) }
								);
							}
							l.processNext(d, T);
						}),
						(l._xhrReadyStateChange = function (d, T, A) {
							d.readyState === 4 &&
								E(d.status, T, d.responseURL, A, X(d), Si(d) || d.response);
						}),
						(l.triggerSend = function (d, T, A) {
							d === void 0 && (d = true);
							try {
								if (l._senderConfig.disableTelemetry()) {
									l._buffer.clear();
								} else {
									if (l._buffer.count() > 0) {
										let D = l._buffer.getItems();
										at(A || 0, d), T ? T.call(r, D, d) : l._sender(D, d);
									}
									a = +new Date();
								}
								clearTimeout(o), (o = null), (i = null);
							} catch (U) {
								let z = or();
								(!z || z > 9) &&
									l
										.diagLog()
										.throwInternal(
											S.CRITICAL,
											h.TransmissionFailed,
											'Telemetry transmission failed, some telemetry will be lost: ' +
												G(U),
											{ exception: O(U) }
										);
							}
						}),
						(l._onError = function (d, T, A) {
							l
								.diagLog()
								.throwInternal(
									S.WARNING,
									h.OnError,
									'Failed to send telemetry.',
									{ message: T }
								),
								l._buffer.clearSent(d);
						}),
						(l._onPartialSuccess = function (d, T) {
							for (
								var A = [], D = [], z = T.errors.reverse(), U = 0, q = z;
								U < q.length;
								U++
							) {
								let $ = q[U],
									ie = d.splice($.index, 1)[0];
								Se($.statusCode) ? D.push(ie) : A.push(ie);
							}
							d.length > 0 && l._onSuccess(d, T.itemsAccepted),
								A.length > 0 &&
									l._onError(
										A,
										X(
											null,
											[
												'partial success',
												T.itemsAccepted,
												'of',
												T.itemsReceived,
											].join(' ')
										)
									),
								D.length > 0 &&
									(L(D),
									l
										.diagLog()
										.throwInternal(
											S.WARNING,
											h.TransmissionFailed,
											'Partial success. Delivered: ' +
												d.length +
												', Failed: ' +
												A.length +
												'. Will retry to send ' +
												D.length +
												' our of ' +
												T.itemsReceived +
												' items'
										));
						}),
						(l._onSuccess = function (d, T) {
							l._buffer.clearSent(d);
						}),
						(l._xdrOnLoad = function (d, T) {
							let A = Si(d);
							if (d && (A + '' == '200' || A === '')) {
								(n = 0), l._onSuccess(T, 0);
							} else {
								let D = w(A);
								D &&
								D.itemsReceived &&
								D.itemsReceived > D.itemsAccepted &&
								!l._senderConfig.isRetryDisabled()
									? l._onPartialSuccess(T, D)
									: l._onError(T, De(d));
							}
						});
					function I(d) {
						return l._sample.isSampledIn(d);
					}
					function E(d, T, A, D, z, U) {
						let q = null;
						if (
							(l._appId || ((q = w(U)), q && q.appId && (l._appId = q.appId)),
							(d < 200 || d >= 300) && d !== 0)
						) {
							if ((d === 301 || d === 307 || d === 308) && !b(A)) {
								l._onError(T, z);
								return;
							}
							!l._senderConfig.isRetryDisabled() && Se(d)
								? (L(T),
								  l
										.diagLog()
										.throwInternal(
											S.WARNING,
											h.TransmissionFailed,
											'. Response code ' +
												d +
												'. Will retry to send ' +
												T.length +
												' items.'
										))
								: l._onError(T, z);
						} else if (ro.isOffline()) {
							if (!l._senderConfig.isRetryDisabled()) {
								let $ = 10;
								L(T, $),
									l
										.diagLog()
										.throwInternal(
											S.WARNING,
											h.TransmissionFailed,
											'. Offline - Response Code: ' +
												d +
												'. Offline status: ' +
												ro.isOffline() +
												'. Will retry to send ' +
												T.length +
												' items.'
										);
							}
						} else {
							b(A),
								d === 206
									? (q || (q = w(U)),
									  q && !l._senderConfig.isRetryDisabled()
											? l._onPartialSuccess(T, q)
											: l._onError(T, z))
									: ((n = 0), l._onSuccess(T, D));
						}
					}
					function b(d) {
						return s >= 10
							? false
							: !x(d) && d !== '' && d !== l._senderConfig.endpointUrl()
							? ((l._senderConfig.endpointUrl = function () {
									return d;
							  }),
							  ++s,
							  true)
							: false;
					}
					function p(d, T) {
						let A = l._senderConfig.endpointUrl(),
							D = l._buffer.batchPayloads(d),
							z = new Blob([D], { type: 'text/plain;charset=UTF-8' }),
							U = Ue().sendBeacon(A, z);
						U
							? (l._buffer.markAsSent(d), l._onSuccess(d, d.length))
							: (v(d, true),
							  l
									.diagLog()
									.throwInternal(
										S.WARNING,
										h.TransmissionFailed,
										'. Failed to send telemetry with Beacon API, retried with xhrSender.'
									));
					}
					function v(d, T) {
						let A = new XMLHttpRequest(),
							D = l._senderConfig.endpointUrl();
						try {
							A[Et] = true;
						} catch (U) {}
						A.open('POST', D, T),
							A.setRequestHeader('Content-type', 'application/json'),
							Rr(D) &&
								A.setRequestHeader(
									te.sdkContextHeader,
									te.sdkContextHeaderAppIdRequest
								),
							R(Qe(u), function (U) {
								A.setRequestHeader(U, u[U]);
							}),
							(A.onreadystatechange = function () {
								return l._xhrReadyStateChange(A, d, d.length);
							}),
							(A.onerror = function (U) {
								return l._onError(d, X(A), U);
							});
						let z = l._buffer.batchPayloads(d);
						A.send(z), l._buffer.markAsSent(d);
					}
					function y(d, T) {
						let A = l._senderConfig.endpointUrl(),
							D = l._buffer.batchPayloads(d),
							z = new Blob([D], { type: 'text/plain;charset=UTF-8' }),
							U = new Headers();
						Rr(A) &&
							U.append(te.sdkContextHeader, te.sdkContextHeaderAppIdRequest),
							R(Qe(u), function (ie) {
								U.append(ie, u[ie]);
							});
						let q = { method: 'POST', headers: U, body: z },
							$ = new Request(A, q);
						fetch($)
							.then(function (ie) {
								if (ie.ok) {
									ie.text().then(function (Ht) {
										E(ie.status, d, ie.url, d.length, ie.statusText, Ht);
									}),
										l._buffer.markAsSent(d);
								} else {
									throw Error(ie.statusText);
								}
							})
							.catch(function (ie) {
								l._onError(d, ie.message);
							});
					}
					function w(d) {
						try {
							if (d && d !== '') {
								let T = Pe().parse(d);
								if (
									T &&
									T.itemsReceived &&
									T.itemsReceived >= T.itemsAccepted &&
									T.itemsReceived - T.itemsAccepted === T.errors.length
								) {
									return T;
								}
							}
						} catch (A) {
							l.diagLog().throwInternal(
								S.CRITICAL,
								h.InvalidBackendResponse,
								'Cannot parse the response. ' + G(A),
								{ response: d }
							);
						}
						return null;
					}
					function L(d, T) {
						if ((T === void 0 && (T = 1), !(!d || d.length === 0))) {
							l._buffer.clearSent(d), n++;
							for (let A = 0, D = d; A < D.length; A++) {
								let z = D[A];
								l._buffer.enqueue(z);
							}
							F(T), Y();
						}
					}
					function F(d) {
						let T = 10,
							A;
						if (n <= 1) {
							A = T;
						} else {
							let D = (Math.pow(2, n) - 1) / 2,
								z = Math.floor(Math.random() * D * T) + 1;
							(z = d * z), (A = Math.max(Math.min(z, 3600), T));
						}
						let U = de() + A * 1e3;
						i = U;
					}
					function Y() {
						if (!o) {
							let d = i ? Math.max(0, i - de()) : 0,
								T = Math.max(l._senderConfig.maxBatchInterval(), d);
							o = setTimeout(function () {
								l.triggerSend(true, null, 1);
							}, T);
						}
					}
					function Se(d) {
						return d === 408 || d === 429 || d === 500 || d === 503;
					}
					function X(d, T) {
						return d
							? 'XMLHttpRequest,Status:' + d.status + ',Response:' + Si(d) ||
									d.response ||
									''
							: T;
					}
					function me(d, T) {
						let A = Ct(),
							D = new XDomainRequest();
						(D.onload = function () {
							return l._xdrOnLoad(D, d);
						}),
							(D.onerror = function ($) {
								return l._onError(d, De(D), $);
							});
						let z = (A && A.location && A.location.protocol) || '';
						if (l._senderConfig.endpointUrl().lastIndexOf(z, 0) !== 0) {
							l
								.diagLog()
								.throwInternal(
									S.WARNING,
									h.TransmissionFailed,
									". Cannot send XDomain request. The endpoint URL protocol doesn't match the hosting page protocol."
								),
								l._buffer.clear();
							return;
						}
						let U = l._senderConfig.endpointUrl().replace(/^(https?:)/, '');
						D.open('POST', U);
						let q = l._buffer.batchPayloads(d);
						D.send(q), l._buffer.markAsSent(d);
					}
					function De(d, T) {
						return d ? 'XDomainRequest,Response:' + Si(d) || '' : T;
					}
					function pt() {
						let d = 'getNotifyMgr';
						return l.core[d] ? l.core[d]() : l.core._notificationManager;
					}
					function at(d, T) {
						let A = pt();
						if (A && A.eventsSendRequest) {
							try {
								A.eventsSendRequest(d, T);
							} catch (D) {
								l.diagLog().throwInternal(
									S.CRITICAL,
									h.NotificationException,
									'send request notification failed: ' + G(D),
									{ exception: O(D) }
								);
							}
						}
					}
					function dt(d) {
						let T = x(d.disableInstrumentationKeyValidation)
							? false
							: d.disableInstrumentationKeyValidation;
						if (T) {
							return true;
						}
						let A =
								'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
							D = new RegExp(A);
						return D.test(d.instrumentationKey);
					}
				}),
				r
			);
		}
		return (
			(e.constructEnvelope = function (r, n, i) {
				let a;
				switch (
					(n !== r.iKey && !x(n) ? (a = yt({}, r, { iKey: n })) : (a = r),
					a.baseType)
				) {
					case Be.dataType:
						return to.EventEnvelopeCreator.Create(i, a);
					case $e.dataType:
						return Cc.TraceEnvelopeCreator.Create(i, a);
					case Fe.dataType:
						return yc.PageViewEnvelopeCreator.Create(i, a);
					case Ze.dataType:
						return Sc.PageViewPerformanceEnvelopeCreator.Create(i, a);
					case he.dataType:
						return hc.ExceptionEnvelopeCreator.Create(i, a);
					case Ve.dataType:
						return xc.MetricEnvelopeCreator.Create(i, a);
					case qe.dataType:
						return vc.DependencyEnvelopeCreator.Create(i, a);
					default:
						return to.EventEnvelopeCreator.Create(i, a);
				}
			}),
			(e._getDefaultAppInsightsChannelConfig = function () {
				return {
					endpointUrl: function () {
						return 'https://dc.services.visualstudio.com/v2/track';
					},
					emitLineDelimitedJson: function () {
						return false;
					},
					maxBatchInterval: function () {
						return 15e3;
					},
					maxBatchSizeInBytes: function () {
						return 102400;
					},
					disableTelemetry: function () {
						return false;
					},
					enableSessionStorageBuffer: function () {
						return true;
					},
					isRetryDisabled: function () {
						return false;
					},
					isBeaconApiDisabled: function () {
						return true;
					},
					onunloadDisableBeacon: function () {
						return false;
					},
					instrumentationKey: function () {},
					namePrefix: function () {},
					samplingPercentage: function () {
						return 100;
					},
					customHeaders: function () {},
				};
			}),
			(e._getEmptyAppInsightsChannelConfig = function () {
				return {
					endpointUrl: void 0,
					emitLineDelimitedJson: void 0,
					maxBatchInterval: void 0,
					maxBatchSizeInBytes: void 0,
					disableTelemetry: void 0,
					enableSessionStorageBuffer: void 0,
					isRetryDisabled: void 0,
					isBeaconApiDisabled: void 0,
					onunloadDisableBeacon: void 0,
					instrumentationKey: void 0,
					namePrefix: void 0,
					samplingPercentage: void 0,
					customHeaders: void 0,
				};
			}),
			e
		);
	})(tt);
});
let no = C(() => {
	kc();
});
let dl;
let io;
let Rc;
let Mc = C(() => {
	Te();
	xe();
	J();
	(dl = 'ai_session'),
		(io = (function () {
			function t() {}
			return t;
		})()),
		(Rc = (function () {
			function t(e, r) {
				let n = this,
					i,
					a,
					o = kt(r),
					c = cr(r);
				W(t, n, function (s) {
					e || (e = {}),
						j(e.sessionExpirationMs) ||
							(e.sessionExpirationMs = function () {
								return t.acquisitionSpan;
							}),
						j(e.sessionRenewalMs) ||
							(e.sessionRenewalMs = function () {
								return t.renewalSpan;
							}),
						(s.config = e);
					let u =
						s.config.sessionCookiePostfix && s.config.sessionCookiePostfix()
							? s.config.sessionCookiePostfix()
							: s.config.namePrefix && s.config.namePrefix()
							? s.config.namePrefix()
							: '';
					(i = function () {
						return dl + u;
					}),
						(s.automaticSession = new io()),
						(s.update = function () {
							let b = de(),
								p = false,
								v = s.automaticSession;
							v.id || (p = !l(v, b));
							let y = s.config.sessionExpirationMs();
							if (!p && y > 0) {
								let w = s.config.sessionRenewalMs(),
									L = b - v.acquisitionDate,
									F = b - v.renewalDate;
								(p = L < 0 || F < 0), (p = p || L > y), (p = p || F > w);
							}
							p ? m(b) : (!a || b - a > t.cookieUpdateInterval) && I(v, b);
						}),
						(s.backup = function () {
							let b = s.automaticSession;
							E(b.id, b.acquisitionDate, b.renewalDate);
						});
					function l(b, p) {
						let v = false,
							y = c.get(i());
						if (y && j(y.split)) {
							v = f(b, y);
						} else {
							let w = dn(o, i());
							w && (v = f(b, w));
						}
						return v || !!b.id;
					}
					function f(b, p) {
						let v = false,
							y = ', session will be reset',
							w = p.split('|');
						if (w.length >= 2) {
							try {
								let L = +w[1] || 0,
									F = +w[2] || 0;
								isNaN(L) || L <= 0
									? o.throwInternal(
											S.WARNING,
											h.SessionRenewalDateIsZero,
											'AI session acquisition date is 0' + y
									  )
									: isNaN(F) || F <= 0
									? o.throwInternal(
											S.WARNING,
											h.SessionRenewalDateIsZero,
											'AI session renewal date is 0' + y
									  )
									: w[0] &&
									  ((b.id = w[0]),
									  (b.acquisitionDate = L),
									  (b.renewalDate = F),
									  (v = true));
							} catch (Y) {
								o.throwInternal(
									S.CRITICAL,
									h.ErrorParsingAISessionCookie,
									'Error parsing ai_session value [' +
										(p || '') +
										']' +
										y +
										' - ' +
										G(Y),
									{ exception: O(Y) }
								);
							}
						}
						return v;
					}
					function m(b) {
						let p = s.config || {},
							v = (p.getNewId ? p.getNewId() : null) || Wt;
						(s.automaticSession.id = v(p.idLength ? p.idLength() : 22)),
							(s.automaticSession.acquisitionDate = b),
							I(s.automaticSession, b),
							kr() ||
								o.throwInternal(
									S.WARNING,
									h.BrowserDoesNotSupportLocalStorage,
									'Browser does not support local storage. Session durations will be inaccurate.'
								);
					}
					function I(b, p) {
						let v = b.acquisitionDate;
						b.renewalDate = p;
						let y = s.config,
							w = y.sessionRenewalMs(),
							L = v + y.sessionExpirationMs() - p,
							F = [b.id, v, p],
							Y = 0;
						L < w ? (Y = L / 1e3) : (Y = w / 1e3);
						let Se = y.cookieDomain ? y.cookieDomain() : null;
						c.set(i(), F.join('|'), y.sessionExpirationMs() > 0 ? Y : null, Se),
							(a = p);
					}
					function E(b, p, v) {
						mn(o, i(), [b, p, v].join('|'));
					}
				});
			}
			return (
				(t.acquisitionSpan = 864e5),
				(t.renewalSpan = 18e5),
				(t.cookieUpdateInterval = 6e4),
				t
			);
		})());
});
let Lc;
let Uc = C(() => {
	Lc = (function () {
		function t() {}
		return t;
	})();
});
let _c;
let Oc = C(() => {
	_c = (function () {
		function t() {
			(this.id = 'browser'), (this.deviceClass = 'Browser');
		}
		return t;
	})();
});
let ml;
let Hc;
let jc = C(() => {
	(ml = '2.6.4'),
		(Hc = (function () {
			function t(e) {
				this.sdkVersion =
					(e.sdkExtension && e.sdkExtension() ? e.sdkExtension() + '_' : '') +
					'javascript:' +
					ml;
			}
			return t;
		})());
});
function zc(t) {
	return !(typeof t !== 'string' || !t || t.match(/,|;|=| |\|/));
}
let Bc;
let Vc = C(() => {
	Te();
	xe();
	J();
	Bc = (function () {
		function t(e, r) {
			this.isNewUser = false;
			let n = kt(r),
				i = cr(r),
				a;
			W(t, this, function (o) {
				o.config = e;
				let c =
					o.config.userCookiePostfix && o.config.userCookiePostfix()
						? o.config.userCookiePostfix()
						: '';
				a = function () {
					return t.userCookieName + c;
				};
				let s = i.get(a());
				if (s) {
					o.isNewUser = false;
					let u = s.split(t.cookieSeparator);
					u.length > 0 && (o.id = u[0]);
				}
				if (!o.id) {
					let l = e || {},
						f = (l.getNewId ? l.getNewId() : null) || Wt;
					o.id = f(l.idLength ? e.idLength() : 22);
					let m = 31536e3,
						I = Me(new Date());
					(o.accountAcquisitionDate = I), (o.isNewUser = true);
					let E = [o.id, I];
					i.set(a(), E.join(t.cookieSeparator), m);
					let b =
						e.namePrefix && e.namePrefix()
							? e.namePrefix() + 'ai_session'
							: 'ai_session';
					gn(n, b);
				}
				o.accountId = e.accountId ? e.accountId() : void 0;
				let p = i.get(t.authUserCookieName);
				if (p) {
					p = decodeURI(p);
					let v = p.split(t.cookieSeparator);
					v[0] && (o.authenticatedId = v[0]),
						v.length > 1 && v[1] && (o.accountId = v[1]);
				}
				(o.setAuthenticatedUserContext = function (y, w, L) {
					L === void 0 && (L = false);
					let F = !zc(y) || (w && !zc(w));
					if (F) {
						n.throwInternal(
							S.WARNING,
							h.SetAuthContextFailedAccountName,
							'Setting auth user context failed. User auth/account id should be of type string, and not contain commas, semi-colons, equal signs, spaces, or vertical-bars.',
							true
						);
						return;
					}
					o.authenticatedId = y;
					let Y = o.authenticatedId;
					w &&
						((o.accountId = w),
						(Y = [o.authenticatedId, o.accountId].join(t.cookieSeparator))),
						L && i.set(t.authUserCookieName, encodeURI(Y));
				}),
					(o.clearAuthenticatedUserContext = function () {
						(o.authenticatedId = null),
							(o.accountId = null),
							i.del(t.authUserCookieName);
					});
			});
		}
		return (
			(t.cookieSeparator = '|'),
			(t.userCookieName = 'ai_user'),
			(t.authUserCookieName = 'ai_authUser'),
			t
		);
	})();
});
let qc;
let Gc = C(() => {
	qc = (function () {
		function t() {}
		return t;
	})();
});
let Kc;
let Wc = C(() => {
	xe();
	J();
	Kc = (function () {
		function t(e, r, n, i) {
			let a = this;
			(a.traceID = e || He()), (a.parentID = r), (a.name = n);
			let o = et();
			!n && o && o.pathname && (a.name = o.pathname), (a.name = ae(i, a.name));
		}
		return t;
	})();
});
function Or(t, e) {
	t && t[e] && Qe(t[e]).length === 0 && delete t[e];
}
let Ci;
let Ii;
let Jc;
let Xc = C(() => {
	Te();
	J();
	Mc();
	xe();
	Uc();
	Oc();
	jc();
	Vc();
	Gc();
	Wc();
	(Ci = 'ext'), (Ii = 'tags');
	Jc = (function () {
		function t(e, r) {
			let n = this,
				i = e.logger;
			(this.appId = function () {
				return null;
			}),
				W(t, this, function (a) {
					(a.application = new Lc()),
						(a.internal = new Hc(r)),
						ar() &&
							((a.sessionManager = new Rc(r, e)),
							(a.device = new _c()),
							(a.location = new qc()),
							(a.user = new Bc(r, e)),
							(a.telemetryTrace = new Kc(void 0, void 0, void 0, i)),
							(a.session = new io())),
						(a.applySessionContext = function (o, c) {
							let s = a.session,
								u = a.sessionManager;
							s && _(s.id)
								? K(ge(o.ext, _e.AppExt), 'sesId', s.id)
								: u &&
								  u.automaticSession &&
								  K(ge(o.ext, _e.AppExt), 'sesId', u.automaticSession.id, _);
						}),
						(a.applyOperatingSystemContxt = function (o, c) {
							K(o.ext, _e.OSExt, a.os);
						}),
						(a.applyApplicationContext = function (o, c) {
							let s = a.application;
							if (s) {
								let u = ge(o, Ii);
								K(u, re.applicationVersion, s.ver, _),
									K(u, re.applicationBuild, s.build, _);
							}
						}),
						(a.applyDeviceContext = function (o, c) {
							let s = a.device;
							if (s) {
								let u = ge(ge(o, Ci), _e.DeviceExt);
								K(u, 'localId', s.id, _),
									K(u, 'ip', s.ip, _),
									K(u, 'model', s.model, _),
									K(u, 'deviceClass', s.deviceClass, _);
							}
						}),
						(a.applyInternalContext = function (o, c) {
							let s = a.internal;
							if (s) {
								let u = ge(o, Ii);
								K(u, re.internalAgentVersion, s.agentVersion, _),
									K(u, re.internalSdkVersion, s.sdkVersion, _),
									(o.baseType === Ft.dataType || o.baseType === Fe.dataType) &&
										(K(u, re.internalSnippet, s.snippetVer, _),
										K(u, re.internalSdkSrc, s.sdkSrc, _));
							}
						}),
						(a.applyLocationContext = function (o, c) {
							let s = n.location;
							s && K(ge(o, Ii, []), re.locationIp, s.ip, _);
						}),
						(a.applyOperationContext = function (o, c) {
							let s = a.telemetryTrace;
							if (s) {
								let u = ge(ge(o, Ci), _e.TraceExt, {
									traceID: void 0,
									parentID: void 0,
								});
								K(u, 'traceID', s.traceID, _),
									K(u, 'name', s.name, _),
									K(u, 'parentID', s.parentID, _);
							}
						}),
						(a.applyWebContext = function (o, c) {
							let s = n.web;
							s && K(ge(o, Ci), _e.WebExt, s);
						}),
						(a.applyUserContext = function (o, c) {
							let s = a.user;
							if (s) {
								let u = ge(o, Ii, []);
								K(u, re.userAccountId, s.accountId, _);
								let l = ge(ge(o, Ci), _e.UserExt);
								K(l, 'id', s.id, _), K(l, 'authId', s.authenticatedId, _);
							}
						}),
						(a.cleanUp = function (o, c) {
							let s = o.ext;
							s &&
								(Or(s, _e.DeviceExt),
								Or(s, _e.UserExt),
								Or(s, _e.WebExt),
								Or(s, _e.OSExt),
								Or(s, _e.AppExt),
								Or(s, _e.TraceExt));
						});
				});
		}
		return t;
	})();
});
let gl;
let An;
let Yc = C(() => {
	ne();
	Te();
	J();
	Xc();
	xe();
	(gl = (function (t) {
		H(e, t);
		function e() {
			let r = t.call(this) || this;
			(r.priority = 110), (r.identifier = Ot);
			let n, i;
			return (
				W(e, r, function (a, o) {
					(a.initialize = function (s, u, l, f) {
						o.initialize(s, u, l, f);
						let m = a._getTelCtx(),
							I = a.identifier,
							E = e.getDefaultConfig();
						(i = i || {}),
							Q(E, function (b, p) {
								i[b] = function () {
									return m.getConfig(I, b, p());
								};
							}),
							(a.context = new Jc(u, i)),
							(n = cn(l, _r)),
							(a.context.appId = function () {
								return n ? n._appId : null;
							}),
							(a._extConfig = i);
					}),
						(a.processTelemetry = function (s, u) {
							if (!x(s)) {
								(u = a._getTelCtx(u)),
									s.name === Fe.envelopeType &&
										u.diagLog().resetInternalMessageCount();
								let l = a.context || {};
								if (
									(l.session &&
										typeof a.context.session.id !== 'string' &&
										l.sessionManager &&
										l.sessionManager.update(),
									c(s, u),
									l.user && l.user.isNewUser)
								) {
									l.user.isNewUser = false;
									let f = new Ft(
										h.SendBrowserInfoOnUserInit,
										(Ue() || {}).userAgent || ''
									);
									u.diagLog().logInternalMessage(S.CRITICAL, f);
								}
								a.processNext(s, u);
							}
						});
					function c(s, u) {
						ge(s, 'tags', []), ge(s, 'ext', {});
						let l = a.context;
						l.applySessionContext(s, u),
							l.applyApplicationContext(s, u),
							l.applyDeviceContext(s, u),
							l.applyOperationContext(s, u),
							l.applyUserContext(s, u),
							l.applyOperatingSystemContxt(s, u),
							l.applyWebContext(s, u),
							l.applyLocationContext(s, u),
							l.applyInternalContext(s, u),
							l.cleanUp(s, u);
					}
				}),
				r
			);
		}
		return (
			(e.getDefaultConfig = function () {
				let r = {
					instrumentationKey: function () {},
					accountId: function () {
						return null;
					},
					sessionRenewalMs: function () {
						return 30 * 60 * 1e3;
					},
					samplingPercentage: function () {
						return 100;
					},
					sessionExpirationMs: function () {
						return 24 * 60 * 60 * 1e3;
					},
					cookieDomain: function () {
						return null;
					},
					sdkExtension: function () {
						return null;
					},
					isBrowserLinkTrackingEnabled: function () {
						return false;
					},
					appId: function () {
						return null;
					},
					namePrefix: function () {},
					sessionCookiePostfix: function () {},
					userCookiePostfix: function () {},
					idLength: function () {
						return 22;
					},
					getNewId: function () {
						return null;
					},
				};
				return r;
			}),
			e
		);
	})(tt)),
		(An = gl);
});
let ao = C(() => {
	Yc();
});
function $c(t, e, r) {
	let n = 0,
		i = t[e],
		a = t[r];
	return i && a && (n = ve(i, a)), n;
}
function xr(t, e, r, n, i) {
	let a = 0,
		o = $c(r, n, i);
	return o && (a = tr(t, e, Ge(o))), a;
}
function tr(t, e, r) {
	let n = 'ajaxPerf',
		i = 0;
	if (t && e && r) {
		let a = (t[n] = t[n] || {});
		(a[e] = r), (i = 1);
	}
	return i;
}
function vl(t, e) {
	let r = t.perfTiming,
		n = e[nt] || {},
		i = 0,
		a = 'name',
		o = 'Start',
		c = 'End',
		s = 'domainLookup',
		u = 'connect',
		l = 'redirect',
		f = 'request',
		m = 'response',
		I = 'duration',
		E = 'startTime',
		b = s + o,
		p = s + c,
		v = u + o,
		y = u + c,
		w = f + o,
		L = f + c,
		F = m + o,
		Y = m + c,
		Se = l + o,
		X = (l = c),
		me = 'transferSize',
		De = 'encodedBodySize',
		pt = 'decodedBodySize',
		at = 'serverTiming';
	if (r) {
		(i |= xr(n, l, r, Se, X)),
			(i |= xr(n, s, r, b, p)),
			(i |= xr(n, u, r, v, y)),
			(i |= xr(n, f, r, w, L)),
			(i |= xr(n, m, r, F, Y)),
			(i |= xr(n, 'networkConnect', r, E, y)),
			(i |= xr(n, 'sentRequest', r, w, Y));
		let dt = r[I];
		dt || (dt = $c(r, E, Y) || 0),
			(i |= tr(n, I, dt)),
			(i |= tr(n, 'perfTotal', dt));
		let d = r[at];
		if (d) {
			let T = {};
			R(d, function (A, D) {
				let z = zi(A[a] || '' + D),
					U = T[z] || {};
				Q(A, function (q, $) {
					((q !== a && _($)) || ir($)) &&
						(U[q] && ($ = U[q] + ';' + $), ($ || !_($)) && (U[q] = $));
				}),
					(T[z] = U);
			}),
				(i |= tr(n, at, T));
		}
		(i |= tr(n, me, r[me])), (i |= tr(n, De, r[De])), (i |= tr(n, pt, r[pt]));
	} else {
		t.perfMark && (i |= tr(n, 'missing', t.perfAttempts));
	}
	i && (e[nt] = n);
}
let nt;
let hl;
let oo;
let Zc = C(() => {
	xe();
	J();
	Te();
	nt = 'properties';
	(hl = (function () {
		function t() {
			let e = this;
			(e.openDone = false),
				(e.setRequestHeaderDone = false),
				(e.sendDone = false),
				(e.abortDone = false),
				(e.stateChangeAttached = false);
		}
		return t;
	})()),
		(oo = (function () {
			function t(e, r, n) {
				let i = this,
					a = n,
					o = 'responseText';
				(i.perfMark = null),
					(i.completed = false),
					(i.requestHeadersSize = null),
					(i.requestHeaders = null),
					(i.responseReceivingDuration = null),
					(i.callbackDuration = null),
					(i.ajaxTotalDuration = null),
					(i.aborted = 0),
					(i.pageUrl = null),
					(i.requestUrl = null),
					(i.requestSize = 0),
					(i.method = null),
					(i.status = null),
					(i.requestSentTime = null),
					(i.responseStartedTime = null),
					(i.responseFinishedTime = null),
					(i.callbackFinishedTime = null),
					(i.endTime = null),
					(i.xhrMonitoringState = new hl()),
					(i.clientFailure = 0),
					(i.traceID = e),
					(i.spanID = r),
					W(t, i, function (c) {
						(c.getAbsoluteUrl = function () {
							return c.requestUrl ? hn(c.requestUrl) : null;
						}),
							(c.getPathName = function () {
								return c.requestUrl ? Tt(a, xn(c.method, c.requestUrl)) : null;
							}),
							(c.CreateTrackItem = function (s, u, l) {
								if (
									((c.ajaxTotalDuration =
										Math.round(
											ve(c.requestSentTime, c.responseFinishedTime) * 1e3
										) / 1e3),
									c.ajaxTotalDuration < 0)
								) {
									return null;
								}
								let f =
									((b = {
										id: '|' + c.traceID + '.' + c.spanID,
										target: c.getAbsoluteUrl(),
										name: c.getPathName(),
										type: s,
										startTime: null,
										duration: c.ajaxTotalDuration,
										success: +c.status >= 200 && +c.status < 400,
										responseCode: +c.status,
										method: c.method,
									}),
									(b[nt] = { HttpMethod: c.method }),
									b);
								if (
									(c.requestSentTime &&
										((f.startTime = new Date()),
										f.startTime.setTime(c.requestSentTime)),
									vl(c, f),
									u &&
										Qe(c.requestHeaders).length > 0 &&
										((f[nt] = f[nt] || {}),
										(f[nt].requestHeaders = c.requestHeaders)),
									l)
								) {
									let m = l();
									if (m) {
										let I = m.correlationContext;
										if (
											(I && (f.correlationContext = I),
											m.headerMap &&
												Qe(m.headerMap).length > 0 &&
												((f[nt] = f[nt] || {}),
												(f[nt].responseHeaders = m.headerMap)),
											c.status >= 400)
										) {
											let E = m.type;
											(f[nt] = f[nt] || {}),
												(E === '' || E === 'text') &&
													(f[nt][o] = m[o]
														? m.statusText + ' - ' + m[o]
														: m.statusText),
												E === 'json' &&
													(f[nt][o] = m.response
														? m.statusText + ' - ' + JSON.stringify(m.response)
														: m.statusText);
										}
									}
								}
								return f;
								let b;
							});
					});
			}
			return t;
		})());
});
let mh;
let Qc = C(() => {
	J();
	J();
	mh = (function () {
		function t() {}
		return (
			(t.GetLength = function (e) {
				let r = 0;
				if (!x(e)) {
					let n = '';
					try {
						n = e.toString();
					} catch (i) {}
					(r = n.length), (r = isNaN(r) ? 0 : r);
				}
				return r;
			}),
			t
		);
	})();
});
let so;
let eu = C(() => {
	J();
	so = (function () {
		function t(e, r) {
			let n = this;
			(n.traceFlag = t.DEFAULT_TRACE_FLAG),
				(n.version = t.DEFAULT_VERSION),
				e && t.isValidTraceId(e) ? (n.traceId = e) : (n.traceId = He()),
				r && t.isValidSpanId(r)
					? (n.spanId = r)
					: (n.spanId = He().substr(0, 16));
		}
		return (
			(t.isValidTraceId = function (e) {
				return (
					e.match(/^[0-9a-f]{32}$/) && e !== '00000000000000000000000000000000'
				);
			}),
			(t.isValidSpanId = function (e) {
				return e.match(/^[0-9a-f]{16}$/) && e !== '0000000000000000';
			}),
			(t.prototype.toString = function () {
				let e = this;
				return e.version + '-' + e.traceId + '-' + e.spanId + '-' + e.traceFlag;
			}),
			(t.DEFAULT_TRACE_FLAG = '01'),
			(t.DEFAULT_VERSION = '00'),
			t
		);
	})();
});
function xl() {
	let t = ot();
	return !t || x(t.Request) || x(t.Request[Ie]) || x(t[Fn]) ? null : t[Fn];
}
function yl(t) {
	let e = false;
	if (typeof XMLHttpRequest !== Oe && !x(XMLHttpRequest)) {
		let r = XMLHttpRequest[Ie];
		e = !x(r) && !x(r.open) && !x(r.send) && !x(r.abort);
	}
	let n = or();
	if ((n && n < 9 && (e = false), e)) {
		try {
			let i = new XMLHttpRequest();
			i[it] = {};
			let a = XMLHttpRequest[Ie].open;
			XMLHttpRequest[Ie].open = a;
		} catch (o) {
			(e = false),
				kn(
					t,
					h.FailedMonitorAjaxOpen,
					'Failed to enable XMLHttpRequest monitoring, extension is not supported',
					{ exception: O(o) }
				);
		}
	}
	return e;
}
function Ti(t) {
	let e = '';
	try {
		!x(t) &&
			!x(t[it]) &&
			!x(t[it].requestUrl) &&
			(e += "(url: '" + t[it].requestUrl + "')");
	} catch (r) {}
	return e;
}
function kn(t, e, r, n, i) {
	t[Nn]()[ru](S.CRITICAL, e, r, n, i);
}
function Ei(t, e, r, n, i) {
	t[Nn]()[ru](S.WARNING, e, r, n, i);
}
function Rn(t, e, r) {
	return function (n) {
		kn(t, e, r, { ajaxDiagnosticsMessage: Ti(n.inst), exception: O(n.err) });
	};
}
function Hr(t, e) {
	return t && e ? t.indexOf(e) : -1;
}
let tu;
let Nn;
let it;
let ru;
let Fn;
let nu;
let Mn;
let iu = C(() => {
	ne();
	xe();
	J();
	Zc();
	Qc();
	eu();
	Te();
	(tu = 'ai.ajxmn.'),
		(Nn = 'diagLog'),
		(it = 'ajaxData'),
		(ru = 'throwInternal'),
		(Fn = 'fetch'),
		(nu = 0);
	Mn = (function (t) {
		H(e, t);
		function e() {
			let r = t.call(this) || this;
			(r.identifier = e.identifier), (r.priority = 120);
			let n = 'trackDependencyDataInternal',
				i = et(),
				a = false,
				o = false,
				c = i && i.host && i.host.toLowerCase(),
				s = e.getEmptyConfig(),
				u = false,
				l = 0,
				f,
				m,
				I,
				E,
				b = false,
				p = 0,
				v = false,
				y = [],
				w = {},
				L;
			return (
				W(e, r, function (F, Y) {
					(F.initialize = function (g, P, N, k) {
						if (!F.isInitialized()) {
							Y.initialize(g, P, N, k);
							let M = F._getTelCtx(),
								V = e.getDefaultConfig();
							Q(V, function (We, yr) {
								s[We] = M.getConfig(e.identifier, We, yr);
							});
							let B = s.distributedTracingMode;
							if (
								((u = s.enableRequestHeaderTracking),
								(b = s.enableAjaxPerfTracking),
								(p = s.maxAjaxCallsPerView),
								(v = s.enableResponseHeaderTracking),
								(L = s.excludeRequestFromAutoTrackingPatterns),
								(I = B === Ke.AI || B === Ke.AI_AND_W3C),
								(m = B === Ke.AI_AND_W3C || B === Ke.W3C),
								b)
							) {
								let Z = g.instrumentationKey || 'unkwn';
								Z.length > 5
									? (E = tu + Z.substring(Z.length - 5) + '.')
									: (E = tu + Z + '.');
							}
							if (
								(s.disableAjaxTracking === false && De(),
								X(),
								N.length > 0 && N)
							) {
								for (var ce = void 0, Ce = 0; !ce && Ce < N.length; ) {
									N[Ce] && N[Ce].identifier === Ot && (ce = N[Ce]), Ce++;
								}
								ce && (f = ce.context);
							}
						}
					}),
						(F.teardown = function () {
							R(y, function (g) {
								g.rm();
							}),
								(y = []),
								(a = false),
								(o = false),
								F.setInitialized(false);
						}),
						(F.trackDependencyData = function (g, P) {
							F[n](g, P);
						}),
						(F.includeCorrelationHeaders = function (g, P, N, k) {
							let M = F._currentWindowHost || c;
							if (P) {
								if (Pt.canIncludeCorrelationHeader(s, g.getAbsoluteUrl(), M)) {
									if (
										(N || (N = {}),
										(N.headers = new Headers(
											N.headers || (P instanceof Request ? P.headers || {} : {})
										)),
										I)
									) {
										var V = '|' + g.traceID + '.' + g.spanID;
										N.headers.set(te.requestIdHeader, V),
											u && (g.requestHeaders[te.requestIdHeader] = V);
									}
									var B = s.appId || (f && f.appId());
									if (
										(B &&
											(N.headers.set(
												te.requestContextHeader,
												te.requestContextAppIdFormat + B
											),
											u &&
												(g.requestHeaders[te.requestContextHeader] =
													te.requestContextAppIdFormat + B)),
										m)
									) {
										var Z = new so(g.traceID, g.spanID);
										N.headers.set(te.traceParentHeader, Z.toString()),
											u &&
												(g.requestHeaders[te.traceParentHeader] = Z.toString());
									}
								}
								return N;
							} else if (k) {
								if (Pt.canIncludeCorrelationHeader(s, g.getAbsoluteUrl(), M)) {
									if (I) {
										var V = '|' + g.traceID + '.' + g.spanID;
										k.setRequestHeader(te.requestIdHeader, V),
											u && (g.requestHeaders[te.requestIdHeader] = V);
									}
									var B = s.appId || (f && f.appId());
									if (
										(B &&
											(k.setRequestHeader(
												te.requestContextHeader,
												te.requestContextAppIdFormat + B
											),
											u &&
												(g.requestHeaders[te.requestContextHeader] =
													te.requestContextAppIdFormat + B)),
										m)
									) {
										var Z = new so(g.traceID, g.spanID);
										k.setRequestHeader(te.traceParentHeader, Z.toString()),
											u &&
												(g.requestHeaders[te.traceParentHeader] = Z.toString());
									}
								}
								return k;
							}
						}),
						(F[n] = function (g, P, N) {
							if (p === -1 || l < p) {
								(s.distributedTracingMode === Ke.W3C ||
									s.distributedTracingMode === Ke.AI_AND_W3C) &&
									typeof g.id === 'string' &&
									g.id[g.id.length - 1] !== '.' &&
									(g.id += '.'),
									x(g.startTime) && (g.startTime = new Date());
								let k = rt.create(
									g,
									qe.dataType,
									qe.envelopeType,
									F[Nn](),
									P,
									N
								);
								F.core.track(k);
							} else {
								l === p &&
									kn(
										F,
										h.MaxAjaxPerPVExceeded,
										'Maximum ajax per page view limit reached, ajax monitoring is paused until the next trackPageView(). In order to increase the limit set the maxAjaxCallsPerView configuration parameter.',
										true
									);
							}
							++l;
						});
					function Se(g) {
						let P = true;
						return (
							(g || s.ignoreHeaders) &&
								R(s.ignoreHeaders, function (N) {
									if (N.toLowerCase() === g.toLowerCase()) {
										return (P = false), -1;
									}
								}),
							P
						);
					}
					function X() {
						let g = xl();
						if (!!g) {
							let P = ot(),
								N = g.polyfill;
							s.disableFetchTracking === false
								? (y.push(
										sn(P, Fn, {
											req: function (k, M, V) {
												let B;
												if (a && !pt(null, M, V) && !(N && o)) {
													let Z = k.ctx();
													B = q(M, V);
													let ce = F.includeCorrelationHeaders(B, M, V);
													ce !== V && k.set(1, ce), (Z.data = B);
												}
											},
											rsp: function (k, M) {
												let V = k.ctx().data;
												V &&
													(k.rslt = k.rslt
														.then(function (B) {
															return (
																ie(k, (B || {}).status, B, V, function () {
																	let Z = {
																		statusText: B.statusText,
																		headerMap: null,
																		correlationContext: Ht(B),
																	};
																	if (v) {
																		let ce = {};
																		B.headers.forEach(function (Ce, We) {
																			Se(We) && (ce[We] = Ce);
																		}),
																			(Z.headerMap = ce);
																	}
																	return Z;
																}),
																B
															);
														})
														.catch(function (B) {
															throw (
																(ie(k, 0, M, V, null, { error: B.message }), B)
															);
														}));
											},
											hkErr: Rn(
												F,
												h.FailedMonitorAjaxOpen,
												'Failed to monitor Window.fetch, monitoring data for this fetch call may be incorrect.'
											),
										})
								  ),
								  (a = true))
								: N &&
								  y.push(
										sn(P, Fn, {
											req: function (k, M, V) {
												pt(null, M, V);
											},
										})
								  ),
								N && (P[Fn].polyfill = N);
						}
					}
					function me(g, P, N) {
						y.push(Ea(g, P, N));
					}
					function De() {
						yl(F) &&
							!o &&
							(me(XMLHttpRequest, 'open', {
								req: function (g, P, N, k) {
									let M = g.inst,
										V = M[it];
									!pt(M, N) &&
										at(M, true) &&
										(!V || !V.xhrMonitoringState.openDone) &&
										dt(M, P, N, k);
								},
								hkErr: Rn(
									F,
									h.FailedMonitorAjaxOpen,
									'Failed to monitor XMLHttpRequest.open, monitoring data for this ajax call may be incorrect.'
								),
							}),
							me(XMLHttpRequest, 'send', {
								req: function (g, P) {
									let N = g.inst,
										k = N[it];
									at(N) &&
										!k.xhrMonitoringState.sendDone &&
										(z('xhr', k),
										(k.requestSentTime = mr()),
										F.includeCorrelationHeaders(k, void 0, void 0, N),
										(k.xhrMonitoringState.sendDone = true));
								},
								hkErr: Rn(
									F,
									h.FailedMonitorAjaxSend,
									'Failed to monitor XMLHttpRequest, monitoring data for this ajax call may be incorrect.'
								),
							}),
							me(XMLHttpRequest, 'abort', {
								req: function (g) {
									let P = g.inst,
										N = P[it];
									at(P) &&
										!N.xhrMonitoringState.abortDone &&
										((N.aborted = 1), (N.xhrMonitoringState.abortDone = true));
								},
								hkErr: Rn(
									F,
									h.FailedMonitorAjaxAbort,
									'Failed to monitor XMLHttpRequest.abort, monitoring data for this ajax call may be incorrect.'
								),
							}),
							u &&
								me(XMLHttpRequest, 'setRequestHeader', {
									req: function (g, P, N) {
										let k = g.inst;
										at(k) && Se(P) && (k[it].requestHeaders[P] = N);
									},
									hkErr: Rn(
										F,
										h.FailedMonitorAjaxSetRequestHeader,
										'Failed to monitor XMLHttpRequest.setRequestHeader, monitoring data for this ajax call may be incorrect.'
									),
								}),
							(o = true));
					}
					function pt(g, P, N) {
						let k = false,
							M = ((_(P) ? P : (P || {}).url || '') || '').toLowerCase();
						if (
							(R(L, function (Z) {
								let ce = Z;
								_(Z) && (ce = new RegExp(Z)), k || (k = ce.test(M));
							}),
							k)
						) {
							return k;
						}
						let V = Hr(M, '?'),
							B = Hr(M, '#');
						return (
							(V === -1 || (B !== -1 && B < V)) && (V = B),
							V !== -1 && (M = M.substring(0, V)),
							x(g)
								? x(P) ||
								  (k =
										(typeof P === 'object' ? P[Et] === true : false) ||
										(N ? N[Et] === true : false))
								: (k = g[Et] === true || M[Et] === true),
							k ? w[M] || (w[M] = 1) : w[M] && (k = true),
							k
						);
					}
					function at(g, P) {
						let N = true,
							k = o;
						return x(g) || (N = P === true || !x(g[it])), k && N;
					}
					function dt(g, P, N, k) {
						let M = (f && f.telemetryTrace && f.telemetryTrace.traceID) || He(),
							V = He().substr(0, 16),
							B = new oo(M, V, F[Nn]());
						(B.method = P),
							(B.requestUrl = N),
							(B.xhrMonitoringState.openDone = true),
							(B.requestHeaders = {}),
							(B.async = k),
							(g[it] = B),
							d(g);
					}
					function d(g) {
						g[it].xhrMonitoringState.stateChangeAttached = Jt.Attach(
							g,
							'readystatechange',
							function () {
								try {
									g && g.readyState === 4 && at(g) && A(g);
								} catch (N) {
									let P = O(N);
									(!P || Hr(P.toLowerCase(), 'c00c023f') === -1) &&
										kn(
											F,
											h.FailedMonitorAjaxRSC,
											"Failed to monitor XMLHttpRequest 'readystatechange' event handler, monitoring data for this ajax call may be incorrect.",
											{ ajaxDiagnosticsMessage: Ti(g), exception: P }
										);
								}
							}
						);
					}
					function T(g) {
						try {
							let P = g.responseType;
							if (P === '' || P === 'text') {
								return g.responseText;
							}
						} catch (N) {}
						return null;
					}
					function A(g) {
						let P = g[it];
						(P.responseFinishedTime = mr()), (P.status = g.status);
						function N(k, M) {
							let V = M || {};
							(V.ajaxDiagnosticsMessage = Ti(g)),
								k && (V.exception = O(k)),
								Ei(
									F,
									h.FailedMonitorAjaxDur,
									"Failed to calculate the duration of the ajax call, monitoring data for this ajax call won't be sent.",
									V
								);
						}
						U(
							'xmlhttprequest',
							P,
							function () {
								try {
									let k = P.CreateTrackItem('Ajax', u, function () {
										let M = {
											statusText: g.statusText,
											headerMap: null,
											correlationContext: D(g),
											type: g.responseType,
											responseText: T(g),
											response: g.response,
										};
										if (v) {
											let V = g.getAllResponseHeaders();
											if (V) {
												let B = oe(V).split(/[\r\n]+/),
													Z = {};
												R(B, function (ce) {
													let Ce = ce.split(': '),
														We = Ce.shift(),
														yr = Ce.join(': ');
													Se(We) && (Z[We] = yr);
												}),
													(M.headerMap = Z);
											}
										}
										return M;
									});
									k
										? F[n](k)
										: N(null, {
												requestSentTime: P.requestSentTime,
												responseFinishedTime: P.responseFinishedTime,
										  });
								} finally {
									try {
										g[it] = null;
									} catch (M) {}
								}
							},
							function (k) {
								N(k, null);
							}
						);
					}
					function D(g) {
						try {
							let P = g.getAllResponseHeaders();
							if (P !== null) {
								let N = Hr(P.toLowerCase(), te.requestContextHeaderLowerCase);
								if (N !== -1) {
									let k = g.getResponseHeader(te.requestContextHeader);
									return Pt.getCorrelationContext(k);
								}
							}
						} catch (M) {
							Ei(
								F,
								h.FailedMonitorAjaxGetCorrelationHeader,
								'Failed to get Request-Context correlation header as it may be not included in the response or not accessible.',
								{ ajaxDiagnosticsMessage: Ti(g), exception: O(M) }
							);
						}
					}
					function z(g, P) {
						if (P.requestUrl && E && b) {
							let N = Ye();
							if (N && j(N.mark)) {
								nu++;
								let k = E + g + '#' + nu;
								N.mark(k);
								let M = N.getEntriesByName(k);
								M && M.length === 1 && (P.perfMark = M[0]);
							}
						}
					}
					function U(g, P, N, k) {
						let M = P.perfMark,
							V = Ye(),
							B = s.maxAjaxPerfLookupAttempts,
							Z = s.ajaxPerfLookupDelay,
							ce = P.requestUrl,
							Ce = 0;
						(function We() {
							try {
								if (V && M) {
									Ce++;
									for (
										let yr = null, fo = V.getEntries(), Pi = fo.length - 1;
										Pi >= 0;
										Pi--
									) {
										let bt = fo[Pi];
										if (bt) {
											if (bt.entryType === 'resource') {
												bt.initiatorType === g &&
													(Hr(bt.name, ce) !== -1 || Hr(ce, bt.name) !== -1) &&
													(yr = bt);
											} else if (
												bt.entryType === 'mark' &&
												bt.name === M.name
											) {
												P.perfTiming = yr;
												break;
											}
											if (bt.startTime < M.startTime - 1e3) {
												break;
											}
										}
									}
								}
								!M || P.perfTiming || Ce >= B || P.async === false
									? (M && j(V.clearMarks) && V.clearMarks(M.name),
									  (P.perfAttempts = Ce),
									  N())
									: setTimeout(We, Z);
							} catch (gu) {
								k(gu);
							}
						})();
					}
					function q(g, P) {
						let N = (f && f.telemetryTrace && f.telemetryTrace.traceID) || He(),
							k = He().substr(0, 16),
							M = new oo(N, k, F[Nn]());
						(M.requestSentTime = mr()),
							g instanceof Request
								? (M.requestUrl = g ? g.url : '')
								: (M.requestUrl = g);
						let V = 'GET';
						P && P.method
							? (V = P.method)
							: g && g instanceof Request && (V = g.method),
							(M.method = V);
						let B = {};
						if (u) {
							let Z = new Headers(
								(P ? P.headers : 0) ||
									(g instanceof Request ? g.headers || {} : {})
							);
							Z.forEach(function (ce, Ce) {
								Se(Ce) && (B[Ce] = ce);
							});
						}
						return (M.requestHeaders = B), z('fetch', M), M;
					}
					function $(g) {
						let P = '';
						try {
							x(g) ||
								(typeof g === 'string'
									? (P += "(url: '" + g + "')")
									: (P += "(url: '" + g.url + "')"));
						} catch (N) {
							kn(
								F,
								h.FailedMonitorAjaxOpen,
								'Failed to grab failed fetch diagnostics message',
								{ exception: O(N) }
							);
						}
						return P;
					}
					function ie(g, P, N, k, M, V) {
						if (!k) {
							return;
						}
						function B(Z, ce, Ce) {
							let We = Ce || {};
							(We.fetchDiagnosticsMessage = $(N)),
								ce && (We.exception = O(ce)),
								Ei(
									F,
									Z,
									"Failed to calculate the duration of the fetch call, monitoring data for this fetch call won't be sent.",
									We
								);
						}
						(k.responseFinishedTime = mr()),
							(k.status = P),
							U(
								'fetch',
								k,
								function () {
									let Z = k.CreateTrackItem('Fetch', u, M);
									Z
										? F[n](Z)
										: B(h.FailedMonitorAjaxDur, null, {
												requestSentTime: k.requestSentTime,
												responseFinishedTime: k.responseFinishedTime,
										  });
								},
								function (Z) {
									B(h.FailedMonitorAjaxGetCorrelationHeader, Z, null);
								}
							);
					}
					function Ht(g) {
						if (g && g.headers) {
							try {
								let P = g.headers.get(te.requestContextHeader);
								return Pt.getCorrelationContext(P);
							} catch (N) {
								Ei(
									F,
									h.FailedMonitorAjaxGetCorrelationHeader,
									'Failed to get Request-Context correlation header as it may be not included in the response or not accessible.',
									{ fetchDiagnosticsMessage: $(g), exception: O(N) }
								);
							}
						}
					}
				}),
				r
			);
		}
		return (
			(e.getDefaultConfig = function () {
				let r = {
					maxAjaxCallsPerView: 500,
					disableAjaxTracking: false,
					disableFetchTracking: true,
					excludeRequestFromAutoTrackingPatterns: void 0,
					disableCorrelationHeaders: false,
					distributedTracingMode: Ke.AI_AND_W3C,
					correlationHeaderExcludedDomains: [
						'*.blob.core.windows.net',
						'*.blob.core.chinacloudapi.cn',
						'*.blob.core.cloudapi.de',
						'*.blob.core.usgovcloudapi.net',
					],
					correlationHeaderDomains: void 0,
					correlationHeaderExcludePatterns: void 0,
					appId: void 0,
					enableCorsCorrelation: false,
					enableRequestHeaderTracking: false,
					enableResponseHeaderTracking: false,
					enableAjaxErrorStatusText: false,
					enableAjaxPerfTracking: false,
					maxAjaxPerfLookupAttempts: 3,
					ajaxPerfLookupDelay: 25,
					ignoreHeaders: ['Authorization', 'X-API-Key', 'WWW-Authenticate'],
				};
				return r;
			}),
			(e.getEmptyConfig = function () {
				let r = this.getDefaultConfig();
				return (
					Q(r, function (n) {
						r[n] = void 0;
					}),
					r
				);
			}),
			(e.prototype.processTelemetry = function (r, n) {
				this.processNext(r, n);
			}),
			(e.identifier = 'AjaxDependencyPlugin'),
			e
		);
	})(tt);
});
let co = C(() => {
	iu();
});
let uo;
let au;
let Sl;
let ou;
let wi;
let lo = C(() => {
	J();
	Qa();
	no();
	ao();
	co();
	xe();
	(au = [
		'snippet',
		'dependencies',
		'properties',
		'_snippetVersion',
		'appInsightsNew',
		'getSKUDefaults',
	]),
		(Sl = { Default: 0, Required: 1, Array: 2, Hidden: 4 }),
		(ou = {
			__proto__: null,
			PropertiesPluginIdentifier: Ot,
			BreezeChannelIdentifier: _r,
			AnalyticsPluginIdentifier: yi,
			Util: Sn,
			CorrelationIdHelper: Pt,
			UrlHelper: _a,
			DateTimeUtils: Oa,
			ConnectionStringParser: ja,
			FieldType: Sl,
			RequestHeaders: te,
			DisabledPropertyName: Et,
			ProcessLegacy: Ut,
			SampleRate: lr,
			HttpMethod: Fr,
			DEFAULT_BREEZE_ENDPOINT: fn,
			AIData: In,
			AIBase: Cn,
			Envelope: Tn,
			Event: Be,
			Exception: he,
			Metric: Ve,
			PageView: Fe,
			PageViewData: gr,
			RemoteDependencyData: qe,
			Trace: $e,
			PageViewPerformance: Ze,
			Data: xt,
			SeverityLevel: _t,
			ConfigurationManager: Xa,
			ContextTagKeys: hr,
			DataSanitizer: Da,
			TelemetryItemCreator: rt,
			CtxTagKeys: re,
			Extensions: _e,
			DistributedTracingModes: Ke,
		}),
		(wi = (function () {
			function t(e) {
				let r = this;
				(r._snippetVersion = '' + (e.sv || e.version || '')),
					(e.queue = e.queue || []),
					(e.version = e.version || 2);
				let n = e.config || {};
				if (n.connectionString) {
					let i = di(n.connectionString),
						a = i.ingestionendpoint;
					(n.endpointUrl = a ? a + '/v2/track' : n.endpointUrl),
						(n.instrumentationKey =
							i.instrumentationkey || n.instrumentationKey);
				}
				(r.appInsights = new bn()),
					(r.properties = new An()),
					(r.dependencies = new Mn()),
					(r.core = new en()),
					(r._sender = new Dn()),
					(r.snippet = e),
					(r.config = n),
					r.getSKUDefaults();
			}
			return (
				(t.prototype.getCookieMgr = function () {
					return this.appInsights.getCookieMgr();
				}),
				(t.prototype.trackEvent = function (e, r) {
					this.appInsights.trackEvent(e, r);
				}),
				(t.prototype.trackPageView = function (e) {
					let r = e || {};
					this.appInsights.trackPageView(r);
				}),
				(t.prototype.trackPageViewPerformance = function (e) {
					let r = e || {};
					this.appInsights.trackPageViewPerformance(r);
				}),
				(t.prototype.trackException = function (e) {
					e && !e.exception && e.error && (e.exception = e.error),
						this.appInsights.trackException(e);
				}),
				(t.prototype._onerror = function (e) {
					this.appInsights._onerror(e);
				}),
				(t.prototype.trackTrace = function (e, r) {
					this.appInsights.trackTrace(e, r);
				}),
				(t.prototype.trackMetric = function (e, r) {
					this.appInsights.trackMetric(e, r);
				}),
				(t.prototype.startTrackPage = function (e) {
					this.appInsights.startTrackPage(e);
				}),
				(t.prototype.stopTrackPage = function (e, r, n, i) {
					this.appInsights.stopTrackPage(e, r, n, i);
				}),
				(t.prototype.startTrackEvent = function (e) {
					this.appInsights.startTrackEvent(e);
				}),
				(t.prototype.stopTrackEvent = function (e, r, n) {
					this.appInsights.stopTrackEvent(e, r, n);
				}),
				(t.prototype.addTelemetryInitializer = function (e) {
					return this.appInsights.addTelemetryInitializer(e);
				}),
				(t.prototype.setAuthenticatedUserContext = function (e, r, n) {
					n === void 0 && (n = false),
						this.properties.context.user.setAuthenticatedUserContext(e, r, n);
				}),
				(t.prototype.clearAuthenticatedUserContext = function () {
					this.properties.context.user.clearAuthenticatedUserContext();
				}),
				(t.prototype.trackDependencyData = function (e) {
					this.dependencies.trackDependencyData(e);
				}),
				(t.prototype.flush = function (e) {
					let r = this;
					e === void 0 && (e = true),
						ct(
							this.core,
							function () {
								return 'AISKU.flush';
							},
							function () {
								R(r.core.getTransmissionControls(), function (n) {
									R(n, function (i) {
										i.flush(e);
									});
								});
							},
							null,
							e
						);
				}),
				(t.prototype.onunloadFlush = function (e) {
					e === void 0 && (e = true),
						R(this.core.getTransmissionControls(), function (r) {
							R(r, function (n) {
								n.onunloadFlush ? n.onunloadFlush() : n.flush(e);
							});
						});
				}),
				(t.prototype.loadAppInsights = function (e, r, n) {
					let i = this;
					e === void 0 && (e = false);
					let a = this;
					function o(c) {
						if (c) {
							let s = '';
							x(a._snippetVersion) || (s += a._snippetVersion),
								e && (s += '.lg'),
								a.context &&
									a.context.internal &&
									(a.context.internal.snippetVer = s || '-'),
								Q(a, function (u, l) {
									_(u) &&
										!j(l) &&
										u &&
										u[0] !== '_' &&
										au.indexOf(u) === -1 &&
										(c[u] = l);
								});
						}
					}
					return (
						e &&
							a.config.extensions &&
							a.config.extensions.length > 0 &&
							Ae('Extensions not allowed in legacy mode'),
						ct(
							a.core,
							function () {
								return 'AISKU.loadAppInsights';
							},
							function () {
								let c = [];
								c.push(a._sender),
									c.push(a.properties),
									c.push(a.dependencies),
									c.push(a.appInsights),
									a.core.initialize(a.config, c, r, n),
									(a.context = a.properties.context),
									uo && a.context && (a.context.internal.sdkSrc = uo),
									o(a.snippet),
									a.emptyQueue(),
									a.pollInternalLogs(),
									a.addHousekeepingBeforeUnload(i);
							}
						),
						a
					);
				}),
				(t.prototype.updateSnippetDefinitions = function (e) {
					Wr(e, this, function (r) {
						return r && au.indexOf(r) === -1;
					});
				}),
				(t.prototype.emptyQueue = function () {
					let e = this;
					try {
						if (Re(e.snippet.queue)) {
							for (let r = e.snippet.queue.length, n = 0; n < r; n++) {
								let i = e.snippet.queue[n];
								i();
							}
							(e.snippet.queue = void 0), delete e.snippet.queue;
						}
					} catch (o) {
						let a = {};
						o && j(o.toString) && (a.exception = o.toString());
					}
				}),
				(t.prototype.pollInternalLogs = function () {
					this.core.pollInternalLogs();
				}),
				(t.prototype.addHousekeepingBeforeUnload = function (e) {
					if (ar() || Wn()) {
						let r = function () {
							e.onunloadFlush(false),
								R(e.appInsights.core._extensions, function (i) {
									if (i.identifier === Ot) {
										return (
											i &&
												i.context &&
												i.context._sessionManager &&
												i.context._sessionManager.backup(),
											-1
										);
									}
								});
						};
						if (!e.appInsights.config.disableFlushOnBeforeUnload) {
							let n = Mt('beforeunload', r);
							(n = Mt('unload', r) || n),
								(n = Mt('pagehide', r) || n),
								(n = Mt('visibilitychange', r) || n),
								!n &&
									!Qi() &&
									e.appInsights.core.logger.throwInternal(
										S.CRITICAL,
										h.FailedToAddHandlerForOnBeforeUnload,
										'Could not add handler for beforeunload and pagehide'
									);
						}
						e.appInsights.config.disableFlushOnUnload ||
							(Mt('pagehide', r), Mt('visibilitychange', r));
					}
				}),
				(t.prototype.getSender = function () {
					return this._sender;
				}),
				(t.prototype.getSKUDefaults = function () {
					let e = this;
					e.config.diagnosticLogInterval =
						e.config.diagnosticLogInterval && e.config.diagnosticLogInterval > 0
							? e.config.diagnosticLogInterval
							: 1e4;
				}),
				t
			);
		})());
	(function () {
		let t = null,
			e = false,
			r = ['://js.monitor.azure.com/', '://az416426.vo.msecnd.net/'];
		try {
			let n = (document || {}).currentScript;
			n && (t = n.src);
		} catch (c) {}
		if (t) {
			try {
				let i = t.toLowerCase();
				if (i) {
					for (let a = '', o = 0; o < r.length; o++) {
						if (i.indexOf(r[o]) !== -1) {
							(a = 'cdn' + (o + 1)),
								i.indexOf('/scripts/') === -1 &&
									(i.indexOf('/next/') !== -1
										? (a += '-next')
										: i.indexOf('/beta/') !== -1 && (a += '-beta')),
								(uo = a + (e ? '.mod' : ''));
							break;
						}
					}
				}
			} catch (c) {}
		}
	})();
});
let Cl;
let su;
let cu = C(() => {
	xe();
	J();
	(Cl = [
		'snippet',
		'getDefaultConfig',
		'_hasLegacyInitializers',
		'_queue',
		'_processLegacyInitializers',
	]),
		(su = (function () {
			function t(e, r) {
				(this._hasLegacyInitializers = false),
					(this._queue = []),
					(this.config = t.getDefaultConfig(e.config)),
					(this.appInsightsNew = r),
					(this.context = {
						addTelemetryInitializer: this.addTelemetryInitializers.bind(this),
					});
			}
			return (
				(t.getDefaultConfig = function (e) {
					return (
						e || (e = {}),
						(e.endpointUrl =
							e.endpointUrl || 'https://dc.services.visualstudio.com/v2/track'),
						(e.sessionRenewalMs = 30 * 60 * 1e3),
						(e.sessionExpirationMs = 24 * 60 * 60 * 1e3),
						(e.maxBatchSizeInBytes =
							e.maxBatchSizeInBytes > 0 ? e.maxBatchSizeInBytes : 102400),
						(e.maxBatchInterval = isNaN(e.maxBatchInterval)
							? 15e3
							: e.maxBatchInterval),
						(e.enableDebug = ee(e.enableDebug)),
						(e.disableExceptionTracking = ee(e.disableExceptionTracking)),
						(e.disableTelemetry = ee(e.disableTelemetry)),
						(e.verboseLogging = ee(e.verboseLogging)),
						(e.emitLineDelimitedJson = ee(e.emitLineDelimitedJson)),
						(e.diagnosticLogInterval = e.diagnosticLogInterval || 1e4),
						(e.autoTrackPageVisitTime = ee(e.autoTrackPageVisitTime)),
						(isNaN(e.samplingPercentage) ||
							e.samplingPercentage <= 0 ||
							e.samplingPercentage >= 100) &&
							(e.samplingPercentage = 100),
						(e.disableAjaxTracking = ee(e.disableAjaxTracking)),
						(e.maxAjaxCallsPerView = isNaN(e.maxAjaxCallsPerView)
							? 500
							: e.maxAjaxCallsPerView),
						(e.isBeaconApiDisabled = ee(e.isBeaconApiDisabled, true)),
						(e.disableCorrelationHeaders = ee(e.disableCorrelationHeaders)),
						(e.correlationHeaderExcludedDomains = e.correlationHeaderExcludedDomains || [
							'*.blob.core.windows.net',
							'*.blob.core.chinacloudapi.cn',
							'*.blob.core.cloudapi.de',
							'*.blob.core.usgovcloudapi.net',
						]),
						(e.disableFlushOnBeforeUnload = ee(e.disableFlushOnBeforeUnload)),
						(e.disableFlushOnUnload = ee(
							e.disableFlushOnUnload,
							e.disableFlushOnBeforeUnload
						)),
						(e.enableSessionStorageBuffer = ee(
							e.enableSessionStorageBuffer,
							true
						)),
						(e.isRetryDisabled = ee(e.isRetryDisabled)),
						(e.isCookieUseDisabled = ee(e.isCookieUseDisabled)),
						(e.isStorageUseDisabled = ee(e.isStorageUseDisabled)),
						(e.isBrowserLinkTrackingEnabled = ee(
							e.isBrowserLinkTrackingEnabled
						)),
						(e.enableCorsCorrelation = ee(e.enableCorsCorrelation)),
						e
					);
				}),
				(t.prototype.addTelemetryInitializers = function (e) {
					let r = this;
					this._hasLegacyInitializers ||
						(this.appInsightsNew.addTelemetryInitializer(function (n) {
							r._processLegacyInitializers(n);
						}),
						(this._hasLegacyInitializers = true)),
						this._queue.push(e);
				}),
				(t.prototype.getCookieMgr = function () {
					return this.appInsightsNew.getCookieMgr();
				}),
				(t.prototype.startTrackPage = function (e) {
					this.appInsightsNew.startTrackPage(e);
				}),
				(t.prototype.stopTrackPage = function (e, r, n, i) {
					this.appInsightsNew.stopTrackPage(e, r, n);
				}),
				(t.prototype.trackPageView = function (e, r, n, i, a) {
					let o = { name: e, uri: r, properties: n, measurements: i };
					this.appInsightsNew.trackPageView(o);
				}),
				(t.prototype.trackEvent = function (e, r, n) {
					this.appInsightsNew.trackEvent({ name: e });
				}),
				(t.prototype.trackDependency = function (e, r, n, i, a, o, c) {
					this.appInsightsNew.trackDependencyData({
						id: e,
						target: n,
						type: i,
						duration: a,
						properties: { HttpMethod: r },
						success: o,
						responseCode: c,
					});
				}),
				(t.prototype.trackException = function (e, r, n, i, a) {
					this.appInsightsNew.trackException({ exception: e });
				}),
				(t.prototype.trackMetric = function (e, r, n, i, a, o) {
					this.appInsightsNew.trackMetric({
						name: e,
						average: r,
						sampleCount: n,
						min: i,
						max: a,
					});
				}),
				(t.prototype.trackTrace = function (e, r, n) {
					this.appInsightsNew.trackTrace({ message: e, severityLevel: n });
				}),
				(t.prototype.flush = function (e) {
					this.appInsightsNew.flush(e);
				}),
				(t.prototype.setAuthenticatedUserContext = function (e, r, n) {
					this.appInsightsNew.context.user.setAuthenticatedUserContext(e, r, n);
				}),
				(t.prototype.clearAuthenticatedUserContext = function () {
					this.appInsightsNew.context.user.clearAuthenticatedUserContext();
				}),
				(t.prototype._onerror = function (e, r, n, i, a) {
					this.appInsightsNew._onerror({
						message: e,
						url: r,
						lineNumber: n,
						columnNumber: i,
						error: a,
					});
				}),
				(t.prototype.startTrackEvent = function (e) {
					this.appInsightsNew.startTrackEvent(e);
				}),
				(t.prototype.stopTrackEvent = function (e, r, n) {
					this.appInsightsNew.stopTrackEvent(e, r, n);
				}),
				(t.prototype.downloadAndSetup = function (e) {
					Ae('downloadAndSetup not implemented in web SKU');
				}),
				(t.prototype.updateSnippetDefinitions = function (e) {
					Wr(e, this, function (r) {
						return r && Cl.indexOf(r) === -1;
					});
				}),
				(t.prototype.loadAppInsights = function () {
					let e = this;
					if (this.config.iKey) {
						let r = this.trackPageView;
						this.trackPageView = function (a, o, c) {
							r.apply(e, [null, a, o, c]);
						};
					}
					let n = 'logPageView';
					typeof this.snippet[n] === 'function' &&
						(this[n] = function (a, o, c) {
							e.trackPageView(null, a, o, c);
						});
					let i = 'logEvent';
					return (
						typeof this.snippet[i] === 'function' &&
							(this[i] = function (a, o, c) {
								e.trackEvent(a, o, c);
							}),
						this
					);
				}),
				(t.prototype._processLegacyInitializers = function (e) {
					return (e.tags[Ut] = this._queue), e;
				}),
				t
			);
		})());
});
let uu;
let lu = C(() => {
	cu();
	lo();
	J();
	uu = (function () {
		function t() {}
		return (
			(t.getAppInsights = function (e, r) {
				let n = new wi(e),
					i = r !== 2;
				if ((Xt(), r === 2)) {
					return n.updateSnippetDefinitions(e), n.loadAppInsights(i), n;
				}
				let a = new su(e, n);
				return a.updateSnippetDefinitions(e), n.loadAppInsights(i), a;
			}),
			t
		);
	})();
});
let fu = {};
hu(fu, {
	AppInsightsCore: () => en,
	ApplicationAnalytics: () => bn,
	ApplicationInsights: () => wi,
	ApplicationInsightsContainer: () => uu,
	BaseCore: () => Zr,
	BaseTelemetryPlugin: () => tt,
	CoreUtils: () => on,
	DependenciesPlugin: () => Mn,
	DistributedTracingModes: () => Ke,
	Event: () => Be,
	Exception: () => he,
	LoggingSeverity: () => S,
	Metric: () => Ve,
	NotificationManager: () => Qr,
	PageView: () => Fe,
	PageViewPerformance: () => Ze,
	PerfEvent: () => sr,
	PerfManager: () => Jr,
	PropertiesPlugin: () => An,
	RemoteDependencyData: () => qe,
	Sender: () => Dn,
	SeverityLevel: () => _t,
	Telemetry: () => ou,
	Trace: () => $e,
	Util: () => Sn,
	_InternalMessageId: () => h,
	doPerf: () => ct,
});
let pu = C(() => {
	lo();
	lu();
	J();
	xe();
	no();
	Qa();
	ao();
	co();
});
let Je;
(function (n) {
	(n.ON = 'on'), (n.ERROR = 'error'), (n.OFF = 'off');
})(Je || (Je = {}));
function jr() {
	let t = 'telemetry',
		e = 'enableTelemetry';
	return import_vscode.env.isTelemetryEnabled !== void 0
		? import_vscode.env.isTelemetryEnabled
			? Je.ON
			: Je.OFF
		: import_vscode.workspace.getConfiguration(t).get(e)
		? Je.ON
		: Je.OFF;
}
let bi = class {
	constructor(e, r, n, i, a) {
		this.extensionId = e;
		this.extensionVersion = r;
		this.telemetryAppender = n;
		this.osShim = i;
		this.firstParty = false;
		this.userOptIn = false;
		this.errorOptIn = false;
		this.disposables = [];
		(this.firstParty = !!a),
			this.updateUserOptStatus(),
			ue.env.onDidChangeTelemetryEnabled !== void 0
				? (this.disposables.push(
						ue.env.onDidChangeTelemetryEnabled(() => this.updateUserOptStatus())
				  ),
				  this.disposables.push(
						ue.workspace.onDidChangeConfiguration(() =>
							this.updateUserOptStatus()
						)
				  ))
				: this.disposables.push(
						ue.workspace.onDidChangeConfiguration(() =>
							this.updateUserOptStatus()
						)
				  );
	}
	updateUserOptStatus() {
		let e = jr();
		(this.userOptIn = e === Je.ON),
			(this.errorOptIn = e === Je.ERROR || e === Je.ON),
			(this.userOptIn || this.errorOptIn) &&
				this.telemetryAppender.instantiateAppender();
	}
	cleanRemoteName(e) {
		if (!e) {
			return 'none';
		}
		let r = 'other';
		return (
			['ssh-remote', 'dev-container', 'attached-container', 'wsl'].forEach(
				(n) => {
					e.indexOf(`${n}+`) === 0 && (r = n);
				}
			),
			r
		);
	}
	get extension() {
		return (
			this._extension === void 0 &&
				(this._extension = ue.extensions.getExtension(this.extensionId)),
			this._extension
		);
	}
	cloneAndChange(e, r) {
		if (e === null || typeof e !== 'object' || typeof r !== 'function') {
			return e;
		}
		let n = {};
		for (let i in e) {
			n[i] = r(i, e[i]);
		}
		return n;
	}
	shouldSendErrorTelemetry() {
		return this.errorOptIn === false
			? false
			: this.firstParty
			? this.cleanRemoteName(ue.env.remoteName) !== 'other'
				? true
				: !(
						this.extension === void 0 ||
						this.extension.extensionKind === ue.ExtensionKind.Workspace ||
						ue.env.uiKind === ue.UIKind.Web
				  )
			: true;
	}
	getCommonProperties() {
		let e = Object.create(null);
		if (
			((e['common.os'] = this.osShim.platform),
			(e['common.platformversion'] = (this.osShim.release || '').replace(
				/^(\d+)(\.\d+)?(\.\d+)?(.*)/,
				'$1$2$3'
			)),
			(e['common.extname'] = this.extensionId),
			(e['common.extversion'] = this.extensionVersion),
			ue && ue.env)
		) {
			switch (
				((e['common.vscodemachineid'] = ue.env.machineId),
				(e['common.vscodesessionid'] = ue.env.sessionId),
				(e['common.vscodeversion'] = ue.version),
				(e['common.isnewappinstall'] = ue.env.isNewAppInstall
					? ue.env.isNewAppInstall.toString()
					: 'false'),
				(e['common.product'] = ue.env.appHost),
				ue.env.uiKind)
			) {
				case ue.UIKind.Web:
					e['common.uikind'] = 'web';
					break;
				case ue.UIKind.Desktop:
					e['common.uikind'] = 'desktop';
					break;
				default:
					e['common.uikind'] = 'unknown';
			}
			e['common.remotename'] = this.cleanRemoteName(ue.env.remoteName);
		}
		return e;
	}
	anonymizeFilePaths(e, r) {
		let n;
		if (e == null) {
			return '';
		}
		let i = [];
		ue.env.appRoot !== '' &&
			i.push(
				new RegExp(ue.env.appRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
			),
			this.extension &&
				i.push(
					new RegExp(
						this.extension.extensionPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
						'gi'
					)
				);
		let a = e;
		if (r) {
			let o = [];
			for (let l of i) {
				for (; (n = l.exec(e)) && n; ) {
					o.push([n.index, l.lastIndex]);
				}
			}
			let c = /^[\\/]?(node_modules|node_modules\.asar)[\\/]/,
				s = /(file:\/\/)?([a-zA-Z]:(\\\\|\\|\/)|(\\\\|\\|\/))?([\w-._]+(\\\\|\\|\/))+[\w-._]*/g,
				u = 0;
			for (a = ''; (n = s.exec(e)) && n; ) {
				n[0] &&
					!c.test(n[0]) &&
					o.every(([l, f]) => n.index < l || n.index >= f) &&
					((a += e.substring(u, n.index) + '<REDACTED: user-file-path>'),
					(u = s.lastIndex));
			}
			u < e.length && (a += e.substr(u));
		}
		for (let o of i) {
			a = a.replace(o, '');
		}
		return a;
	}
	removePropertiesWithPossibleUserInfo(e) {
		if (typeof e !== 'object') {
			return;
		}
		let r = Object.create(null);
		for (let n of Object.keys(e)) {
			let i = e[n];
			if (!i) {
				continue;
			}
			let a = /@[a-zA-Z0-9-.]+/;
			/\S*(key|token|sig|password|passwd|pwd)[="':\s]+\S*/.test(i.toLowerCase())
				? (r[n] = '<REDACTED: secret>')
				: a.test(i)
				? (r[n] = '<REDACTED: email>')
				: (r[n] = i);
		}
		return r;
	}
	sendTelemetryEvent(e, r, n) {
		if (this.userOptIn && e !== '') {
			r = { ...r, ...this.getCommonProperties() };
			let i = this.cloneAndChange(r, (a, o) =>
				this.anonymizeFilePaths(o, this.firstParty)
			);
			this.telemetryAppender.logEvent(`${this.extensionId}/${e}`, {
				properties: this.removePropertiesWithPossibleUserInfo(i),
				measurements: n,
			});
		}
	}
	sendTelemetryErrorEvent(e, r, n, i) {
		if (this.errorOptIn && e !== '') {
			r = { ...r, ...this.getCommonProperties() };
			let a = this.cloneAndChange(r, (o, c) =>
				this.shouldSendErrorTelemetry()
					? this.anonymizeFilePaths(c, this.firstParty)
					: i === void 0 || i.indexOf(o) !== -1
					? 'REDACTED'
					: this.anonymizeFilePaths(c, this.firstParty)
			);
			this.telemetryAppender.logEvent(`${this.extensionId}/${e}`, {
				properties: this.removePropertiesWithPossibleUserInfo(a),
				measurements: n,
			});
		}
	}
	sendTelemetryException(e, r, n) {
		if (this.shouldSendErrorTelemetry() && this.errorOptIn && e) {
			r = { ...r, ...this.getCommonProperties() };
			let i = this.cloneAndChange(r, (a, o) =>
				this.anonymizeFilePaths(o, this.firstParty)
			);
			e.stack && (e.stack = this.anonymizeFilePaths(e.stack, this.firstParty)),
				this.telemetryAppender.logException(e, {
					properties: this.removePropertiesWithPossibleUserInfo(i),
					measurements: n,
				});
		}
	}
	dispose() {
		return (
			this.telemetryAppender.flush(),
			Promise.all(this.disposables.map((e) => e.dispose()))
		);
	}
};
let du = class {
	constructor(e) {
		this._key = e;
		this._isInstantiated = false;
		jr() !== Je.OFF && this.instantiateAppender();
	}
	logEvent(e, r) {
		!this._aiClient ||
			this._aiClient.trackEvent(
				{ name: e },
				{ ...r.properties, ...r.measurements }
			);
	}
	logException(e, r) {
		!this._aiClient ||
			this._aiClient.trackException({
				exception: e,
				properties: { ...r.properties, ...r.measurements },
			});
	}
	flush() {
		return (
			this._aiClient && (this._aiClient.flush(), (this._aiClient = void 0)),
			Promise.resolve(void 0)
		);
	}
	instantiateAppender() {
		this._isInstantiated ||
			Promise.resolve()
				.then(() => (pu(), fu))
				.then((e) => {
					let r;
					this._key &&
						this._key.indexOf('AIF-') === 0 &&
						(r = 'https://vortex.data.microsoft.com/collect/v1'),
						(this._aiClient = new e.ApplicationInsights({
							config: {
								instrumentationKey: this._key,
								endpointUrl: r,
								disableAjaxTracking: true,
								disableExceptionTracking: true,
								disableFetchTracking: true,
								disableCorrelationHeaders: true,
								disableCookiesUsage: true,
								autoTrackPageVisitTime: false,
								emitLineDelimitedJson: true,
								disableInstrumentationKeyValidation: true,
							},
						})),
						this._aiClient.loadAppInsights();
					let n = jr();
					r &&
						(n === Je.ON || n === Je.ERROR) &&
						fetch(r).catch(() => (this._aiClient = void 0)),
						(this._isInstantiated = true);
				});
	}
};
let mu = class extends bi {
	constructor(e, r, n, i) {
		let a = new du(n);
		n && n.indexOf('AIF-') === 0 && (i = true);
		super(e, r, a, { release: navigator.appVersion, platform: 'web' }, i);
	}
};

// client/src/main.ts
function activate(context) {
	const telemetry = new mu(
		context.extension.id,
		context.extension.packageJSON['version'],
		context.extension.packageJSON['aiKey']
	);
	const supportedLanguages = new SupportedLanguages(context);
	let serverHandles = [];
	startServer();
	function startServer() {
		serverHandles.push(_startServer(context, supportedLanguages, telemetry));
	}
	async function stopServers() {
		const oldHandles = serverHandles.slice(0);
		serverHandles = [];
		const result = await Promise.allSettled(oldHandles);
		for (const item of result) {
			if (item.status === 'fulfilled') {
				item.value.dispose();
			}
		}
	}
	context.subscriptions.push(supportedLanguages);
	context.subscriptions.push(
		supportedLanguages.onDidChange(() => {
			stopServers();
			startServer();
		})
	);
	context.subscriptions.push(new vscode2.Disposable(stopServers));
}
async function _showStatusAndInfo(
	context,
	supportedLanguages,
	showCommandHint
) {
	const disposables = [];
	const _mementoKey = 'didShowMessage';
	const didShowExplainer = context.globalState.get(_mementoKey, false);
	disposables.push(
		vscode2.commands.registerCommand('anycode.resetDidShowMessage', () =>
			context.globalState.update(_mementoKey, false)
		)
	);
	const statusItem = vscode2.languages.createLanguageStatusItem(
		'info',
		supportedLanguages.getSupportedLanguagesAsSelector()
	);
	disposables.push(statusItem);
	statusItem.severity = vscode2.LanguageStatusSeverity.Warning;
	statusItem.text = `Partial Mode`;
	if (showCommandHint) {
		statusItem.detail =
			'Language support for this file is inaccurate. $(lightbulb-autofix) Did not index all files because search [indexing is disabled](command:remoteHub.enableIndexing).';
	} else {
		statusItem.detail = 'Language support for this file is inaccurate.';
	}
	statusItem.command = {
		title: 'Learn More',
		command: 'vscode.open',
		arguments: [vscode2.Uri.parse('https://aka.ms/vscode-anycode')],
	};
	if (!didShowExplainer) {
		async function showMessage() {
			await vscode2.window.showInformationMessage(
				'Language support is inaccurate in this context, results may be imprecise and incomplete.'
			);
		}
		const provideFyi = async () => {
			registrations.dispose();
			context.globalState.update(_mementoKey, true);
			context.globalState.setKeysForSync([_mementoKey]);
			showMessage();
			return void 0;
		};
		const selector = supportedLanguages.getSupportedLanguagesAsSelector();
		const registrations = vscode2.Disposable.from(
			vscode2.languages.registerDefinitionProvider(selector, {
				provideDefinition: provideFyi,
			}),
			vscode2.languages.registerReferenceProvider(selector, {
				provideReferences: provideFyi,
			})
		);
		disposables.push(registrations);
	}
	return vscode2.Disposable.from(...disposables);
}
async function _startServer(context, supportedLanguages, telemetry) {
	const disposables = [];
	function _sendFeatureTelementry(name, language) {
		telemetry.sendTelemetryEvent('feature', { name, language });
	}
	const databaseName = context.workspaceState.get(
		'dbName',
		`anycode_${Math.random().toString(32).slice(2)}`
	);
	context.workspaceState.update('dbName', databaseName);
	const clientOptions = {
		outputChannelName: 'anycode',
		revealOutputChannelOn:
			import_vscode_languageclient.RevealOutputChannelOn.Never,
		documentSelector: supportedLanguages.getSupportedLanguagesAsSelector(),
		synchronize: {},
		initializationOptions: {
			treeSitterWasmUri: vscode2.Uri.joinPath(
				context.extensionUri,
				'./server/tree-sitter/tree-sitter.wasm'
			).toString(),
			supportedLanguages: supportedLanguages.getSupportedLanguages(),
			databaseName,
		},
		middleware: {
			provideWorkspaceSymbols(query, token, next) {
				_sendFeatureTelementry('workspaceSymbols', '');
				return next(query, token);
			},
			provideDefinition(document2, position, token, next) {
				_sendFeatureTelementry('definition', document2.languageId);
				return next(document2, position, token);
			},
			provideReferences(document2, position, options, token, next) {
				_sendFeatureTelementry('references', document2.languageId);
				return next(document2, position, options, token);
			},
			provideDocumentHighlights(document2, position, token, next) {
				_sendFeatureTelementry('documentHighlights', document2.languageId);
				return next(document2, position, token);
			},
			provideCompletionItem(document2, position, context2, token, next) {
				_sendFeatureTelementry('completions', document2.languageId);
				return next(document2, position, context2, token);
			},
		},
	};
	const serverMain = vscode2.Uri.joinPath(
		context.extensionUri,
		'prebuilt/anycode.server.js'
	);
	const worker = new Worker(serverMain.toString());
	const client = new import_browser.LanguageClient(
		'anycode',
		'anycode',
		clientOptions,
		worker
	);
	disposables.push(client.start());
	disposables.push(new vscode2.Disposable(() => worker.terminate()));
	await client.onReady();
	const findAndSearchSuffixes = [];
	for (const [info, config] of supportedLanguages.getSupportedLanguages()) {
		if (config.workspaceSymbols || config.references || config.definitions) {
			findAndSearchSuffixes.push(info.suffixes);
		}
	}
	const langPattern = `**/*.{${findAndSearchSuffixes.join(',')}}`;
	const watcher = vscode2.workspace.createFileSystemWatcher(langPattern);
	disposables.push(watcher);
	const exclude = `{${[
		...Object.keys(
			vscode2.workspace.getConfiguration('search', null).get('exclude') ?? {}
		),
		...Object.keys(
			vscode2.workspace.getConfiguration('files', null).get('exclude') ?? {}
		),
	].join(',')}}`;
	let size = Math.max(
		0,
		vscode2.workspace.getConfiguration('anycode').get('symbolIndexSize', 500)
	);
	const init = Promise.resolve(
		vscode2.workspace.findFiles(langPattern, exclude).then(async (all) => {
			let hasWorkspaceContents = 0;
			if (all.length > 50) {
				if (await _canInitWithoutLimits()) {
					size = Number.MAX_SAFE_INTEGER;
					hasWorkspaceContents = 1;
				}
			}
			const uris = all.slice(0, size);
			console.info(
				`USING ${uris.length} of ${all.length} files for ${langPattern}`
			);
			const t1 = performance.now();
			await client.sendRequest('queue/init', uris.map(String));
			telemetry.sendTelemetryEvent('init', void 0, {
				numOfFiles: all.length,
				indexSize: uris.length,
				hasWorkspaceContents,
				duration: performance.now() - t1,
			});
			disposables.push(
				await _showStatusAndInfo(
					context,
					supportedLanguages,
					!hasWorkspaceContents && _isRemoteHubWorkspace()
				)
			);
		})
	);
	const initCancel = new Promise((resolve) =>
		disposables.push(new vscode2.Disposable(resolve))
	);
	vscode2.window.withProgress(
		{ location: vscode2.ProgressLocation.Window, title: 'Building Index...' },
		() => Promise.race([init, initCancel])
	);
	disposables.push(
		watcher.onDidCreate((uri) => {
			client.sendNotification('queue/add', uri.toString());
		})
	);
	disposables.push(
		watcher.onDidDelete((uri) => {
			client.sendNotification('queue/remove', uri.toString());
			client.sendNotification('file-cache/remove', uri.toString());
		})
	);
	disposables.push(
		watcher.onDidChange((uri) => {
			client.sendNotification('queue/add', uri.toString());
			client.sendNotification('file-cache/remove', uri.toString());
		})
	);
	client.onRequest('file/read', async (raw) => {
		const uri = vscode2.Uri.parse(raw);
		if (uri.scheme === 'vscode-notebook-cell') {
			try {
				const doc = await vscode2.workspace.openTextDocument(uri);
				return new TextEncoder().encode(doc.getText());
			} catch (err) {
				console.warn(err);
				return new Uint8Array();
			}
		}
		if (vscode2.workspace.fs.isWritableFileSystem(uri.scheme) === void 0) {
			return new Uint8Array();
		}
		let data;
		try {
			const stat = await vscode2.workspace.fs.stat(uri);
			if (stat.size > 1024 ** 2) {
				console.warn(
					`IGNORING "${uri.toString()}" because it is too large (${
						stat.size
					}bytes)`
				);
				data = new Uint8Array();
			} else {
				data = await vscode2.workspace.fs.readFile(uri);
			}
			return data;
		} catch (err) {
			console.warn(err);
			return new Uint8Array();
		}
	});
	const persistUri =
		context.storageUri &&
		vscode2.Uri.joinPath(context.storageUri, 'anycode.db');
	client.onRequest('persisted/read', async () => {
		if (!persistUri) {
			return new Uint8Array();
		}
		try {
			return await vscode2.workspace.fs.readFile(persistUri);
		} catch {
			return new Uint8Array();
		}
	});
	client.onRequest('persisted/write', async (data) => {
		if (persistUri) {
			await vscode2.workspace.fs.writeFile(persistUri, data);
		}
	});
	return vscode2.Disposable.from(...disposables);
}
function _isRemoteHubWorkspace() {
	if (
		!vscode2.extensions.getExtension('GitHub.remoteHub') &&
		!vscode2.extensions.getExtension('GitHub.remoteHub-insiders')
	) {
		return false;
	}
	return (
		vscode2.workspace.workspaceFolders?.every(
			(folder) => folder.uri.scheme === 'vscode-vfs'
		) ?? false
	);
}
async function _canInitWithoutLimits() {
	if (!vscode2.workspace.workspaceFolders) {
		return false;
	}
	const remoteFolders = vscode2.workspace.workspaceFolders.filter(
		(folder) => folder.uri.scheme === 'vscode-vfs'
	);
	if (remoteFolders.length === 0) {
		return true;
	}
	const remoteHub =
		vscode2.extensions.getExtension('GitHub.remoteHub') ??
		vscode2.extensions.getExtension('GitHub.remoteHub-insiders');
	const remoteHubApi = await remoteHub?.activate();
	if (typeof remoteHubApi?.loadWorkspaceContents !== 'function') {
		return false;
	}
	for (const folder of remoteFolders) {
		if (!(await remoteHubApi.loadWorkspaceContents(folder.uri))) {
			return false;
		}
	}
	return true;
}
/*!
 * Microsoft Dynamic Proto Utility, 1.1.4
 * Copyright (c) Microsoft and contributors. All rights reserved.
 */
