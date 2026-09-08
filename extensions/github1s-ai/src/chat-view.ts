import * as vscode from 'vscode';

import {
	parseMarkdownHighlightRequest,
	parseViewEvent,
	type MarkdownHighlightRequest,
	type ViewMessage,
} from '@/common/protocol';
import { currentFile, currentSelection } from '@/contexts';
import { Controllers } from '@/controllers';
import { computeSyntaxHighlighting, onDidChangeSyntaxHighlighting } from '@/helpers/highlighting';

interface ChatHtmlOptions {
	cspSource: string;
	nonce: string;
	setiFontUri: string;
	scriptUri: string;
	styleUri: string;
}

const COMMAND_EVENTS = [
	['github1s-ai.openChat', 'app.openChat'],
	['github1s-ai.openChatHistory', 'app.openHistory'],
	['github1s-ai.newChat', 'app.newChat'],
	['github1s-ai.openSettings', 'app.openSettings'],
] as const;

const createChatHtml = (options: ChatHtmlOptions): string => {
	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${options.cspSource} 'nonce-${options.nonce}'; font-src ${options.cspSource} data:; img-src ${options.cspSource} data:; script-src 'nonce-${options.nonce}';">
  <link rel="stylesheet" href="${options.styleUri}">
  <style nonce="${options.nonce}">@font-face { font-family: "github1s-seti"; font-style: normal; font-weight: normal; font-display: block; src: url("${options.setiFontUri}") format("woff"); }</style>
  <style id="syntax-highlighting-theme" nonce="${options.nonce}"></style>
  <title>GitHub1s AI Chat</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${options.nonce}" type="module" defer src="${options.scriptUri}"></script>
</body>
</html>`;
};

export class ChatViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
	static readonly viewType = 'github1s-ai.chatView';

	private readonly viewDisposables: vscode.Disposable[] = [];
	private readonly cmdDisposables: vscode.Disposable[] = [];

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly controllers: Controllers,
	) {
		this.cmdDisposables.push(...this.registerChatViewCommands());
	}

	resolveWebviewView(view: vscode.WebviewView): void {
		this.disposeView();

		const assetsRoot = vscode.Uri.joinPath(this.extensionUri, 'dist', 'assets');
		view.webview.options = {
			enableScripts: true,
			localResourceRoots: [assetsRoot],
		};
		view.webview.html = createChatHtml({
			cspSource: view.webview.cspSource,
			nonce: createNonce(),
			setiFontUri: view.webview.asWebviewUri(vscode.Uri.joinPath(assetsRoot, 'seti.woff')).toString(),
			scriptUri: view.webview.asWebviewUri(vscode.Uri.joinPath(assetsRoot, 'chat.js')).toString(),
			styleUri: view.webview.asWebviewUri(vscode.Uri.joinPath(assetsRoot, 'chat.css')).toString(),
		});

		this.viewDisposables.push(
			this.controllers.onStateChange((state) => {
				void view.webview.postMessage({ type: 'app.setState', state } satisfies ViewMessage);
			}),
			view.webview.onDidReceiveMessage((event) => {
				const highlightRequest = parseMarkdownHighlightRequest(event);
				if (highlightRequest) {
					void this.respondWithSyntaxHighlighting(view.webview, highlightRequest).catch(() => undefined);
					return;
				}
				const parsed = parseViewEvent(event);
				if (parsed) {
					this.controllers
						.emit(parsed)
						.then((message) => message && view.webview.postMessage(message))
						.catch(() => undefined);
				}
			}),
		);
		const highlightingListener = onDidChangeSyntaxHighlighting(() => {
			void view.webview.postMessage({ type: 'markdown.highlightingChanged' } satisfies ViewMessage);
		});
		if (highlightingListener) this.viewDisposables.push(highlightingListener);
	}

	registerChatViewCommands(): vscode.Disposable[] {
		const focusGithub1sAI = () => vscode.commands.executeCommand(`${ChatViewProvider.viewType}.focus`);
		return [
			...COMMAND_EVENTS.map(([command, event]) =>
				vscode.commands.registerCommand(command, async () => {
					await focusGithub1sAI();
					await this.controllers.emit({ type: event });
				}),
			),
			vscode.commands.registerCommand('github1s-ai.addContextToChat', async (resource?: vscode.Uri) => {
				const editor = resource
					? vscode.window.visibleTextEditors.find(({ document }) => document.uri.toString() === resource.toString())
					: vscode.window.activeTextEditor;
				if (!editor) return;
				// Capture the target file or selection before opening chat can change the editor context.
				const descriptor = await (editor.selection.isEmpty ? currentFile(editor.document) : currentSelection(editor));
				if (!descriptor) return;
				await this.controllers.emit({ type: 'app.openChat' });
				await this.controllers.emit({ type: 'chat.addContextAttachment', action: 'descriptor', descriptor });
				await focusGithub1sAI();
			}),
		];
	}

	dispose(): void {
		this.disposeView();
		for (const disposable of this.cmdDisposables.splice(0)) {
			disposable.dispose();
		}
	}

	private disposeView(): void {
		for (const disposable of this.viewDisposables.splice(0)) {
			disposable.dispose();
		}
	}

	private async respondWithSyntaxHighlighting(
		webview: vscode.Webview,
		request: MarkdownHighlightRequest,
	): Promise<void> {
		const highlighting = await computeSyntaxHighlighting(request.source, request.languageId);
		await webview.postMessage({
			type: 'markdown.highlightResult',
			requestId: request.requestId,
			...(highlighting ? { highlighting } : {}),
		} satisfies ViewMessage);
	}
}

const createNonce = (): string => {
	const bytes = new Uint8Array(16);
	globalThis.crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
