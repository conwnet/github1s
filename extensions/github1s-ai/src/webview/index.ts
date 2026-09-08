import { html, render } from 'htm/preact';

import type { ViewMessage, ViewRequest } from '@/common/protocol';

import { App } from './App';
import { setiFileIconPresentation } from './helpers/attachments';

const vscode = acquireVsCodeApi();
const root = document.getElementById('app');

if (!root) throw new Error('Missing webview app root.');

const post = (request: ViewRequest): void => vscode.postMessage(request);

window.addEventListener('message', ({ data }: MessageEvent<unknown>) => {
	if (!data || typeof data !== 'object') return;
	const message = data as Partial<Extract<ViewMessage, { type: 'settings.historyExport' }>>;
	if (message.type !== 'settings.historyExport' || !message.filename || typeof message.content !== 'string') return;
	const url = URL.createObjectURL(new Blob([message.content], { type: 'application/json' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = message.filename;
	document.body.append(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
});

render(html`<${App} post=${post} />`, root);

void document.fonts
	.load('15px "github1s-seti"', setiFileIconPresentation('typescript').glyph)
	.then((fonts) => {
		if (fonts.length > 0) document.documentElement.classList.add('has-seti-file-icons');
	})
	.catch(() => undefined);
