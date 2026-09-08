interface GitHub1sAiVsCodeApi {
	postMessage(message: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}

declare function acquireVsCodeApi(): GitHub1sAiVsCodeApi;
