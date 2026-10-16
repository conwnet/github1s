import { html } from 'htm/preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';

import { highlightCodeBlocks, type PostMarkdownHighlightRequest } from '../helpers/highlighting';
import { renderMarkdown } from '../helpers/markdown';

declare let __webpack_nonce__: string;
// eslint-disable-next-line prefer-const -- Webpack replaces this assignment with its runtime nonce.
__webpack_nonce__ = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ?? '';

interface MarkdownProps {
	source: string;
	className?: string;
	post: PostMarkdownHighlightRequest;
}

const COPY_FEEDBACK_DURATION_MS = 1_600;
let diagramSequence = 0;
let mermaidTheme: string | undefined;

export const Markdown = ({ source, className, post }: MarkdownProps) => {
	const markup = useMemo(() => renderMarkdown(source), [source]);
	const root = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!root.current) return;
		return highlightCodeBlocks(root.current, post);
	}, [markup, post]);

	useEffect(() => {
		if (!root.current) return;
		return setupMermaidBlocks(root.current);
	}, [markup]);

	return html`<div
		ref=${root}
		class=${className ? `markdown ${className}` : 'markdown'}
		onClick=${copyCodeBlock}
		dangerouslySetInnerHTML=${{ __html: markup }}
	/>`;
};

const setupMermaidBlocks = (root: HTMLElement): (() => void) | undefined => {
	const blocks = root.querySelectorAll<HTMLElement>('code[data-code-language="mermaid"]');
	if (blocks.length === 0) return;
	const renderers: (() => void)[] = [];
	for (const code of blocks) {
		const pre = code.closest('pre');
		const copy = code.closest('.code-block')?.querySelector('.code-copy');
		if (!pre || !copy) continue;
		const diagram = document.createElement('div');
		diagram.className = 'mermaid-diagram';
		pre.after(diagram);
		const controls = document.createElement('span');
		controls.className = 'mermaid-controls';
		controls.innerHTML = `
			<button type="button" value="0.8" aria-label="Zoom out" title="Zoom out">−</button>
			<button type="button" value="1.25" aria-label="Zoom in" title="Zoom in">+</button>
			<button type="button" value="0" aria-label="Reset zoom" title="Reset zoom">↺</button>`;
		const zoomButtons = controls.querySelectorAll('button');
		const toggle = document.createElement('button');
		toggle.type = 'button';
		controls.append(toggle);
		copy.before(controls);
		const setDiagramVisible = (visible: boolean) => {
			pre.hidden = visible;
			diagram.hidden = !visible;
			for (const button of zoomButtons) button.hidden = !visible;
			toggle.textContent = visible ? 'Source' : 'Diagram';
			toggle.title = visible ? 'Show source' : 'Show diagram';
		};
		setDiagramVisible(false);
		let zoom = 1;
		const updateZoom = (factor = 0) => {
			const svgElement = diagram.querySelector<SVGSVGElement>('svg');
			if (!svgElement) return;
			zoom = factor ? Math.min(4, Math.max(0.25, zoom * factor)) : 1;
			svgElement.style.width = `${zoom * 100}%`;
			const width = svgElement.viewBox.baseVal.width;
			if (width > 0) svgElement.style.maxWidth = `${width * zoom}px`;
			if (!factor) diagram.scrollTo(0, 0);
		};
		let renderedTheme: string | undefined;
		let renderSequence = 0;
		const render = async () => {
			const sequence = ++renderSequence;
			const theme = document.body.matches('.vscode-dark, .vscode-high-contrast') ? 'dark' : 'default';
			toggle.disabled = true;
			try {
				if (theme !== renderedTheme) {
					const { default: mermaid } = await import('mermaid');
					if (!code.isConnected || sequence !== renderSequence) return;
					if (theme !== mermaidTheme) {
						mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, theme });
						mermaidTheme = theme;
					}
					const { svg } = await mermaid.render(`mermaid-${++diagramSequence}`, code.textContent ?? '');
					if (!code.isConnected || sequence !== renderSequence) return;
					diagram.innerHTML = svg;
					renderedTheme = theme;
					updateZoom(1);
				}
				setDiagramVisible(true);
			} catch {
				// Keep the source visible while a diagram is incomplete or invalid.
				if (sequence === renderSequence) setDiagramVisible(false);
			} finally {
				if (sequence === renderSequence) toggle.disabled = false;
			}
		};
		controls.onclick = ({ target }) => {
			if (!(target instanceof HTMLButtonElement)) return;
			if (target === toggle) {
				if (pre.hidden) setDiagramVisible(false);
				else void render();
			} else updateZoom(Number(target.value));
		};
		renderers.push(() => {
			if (pre.hidden || toggle.disabled) void render();
		});
	}
	const observer = new MutationObserver(() => {
		for (const render of renderers) render();
	});
	observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
	return () => observer.disconnect();
};

const copyCodeBlock = async (event: MouseEvent): Promise<void> => {
	const target = event.target;
	const root = event.currentTarget;
	if (!(target instanceof Element) || !(root instanceof Element)) return;
	const button = target.closest<HTMLButtonElement>('button[data-copy-code]');
	if (!button || !root.contains(button)) return;
	const code = button.closest('.code-block')?.querySelector('code')?.textContent;
	if (code === undefined || !navigator.clipboard) return;

	try {
		await navigator.clipboard.writeText(code || '');
		button.textContent = 'Copied';
		button.setAttribute('aria-label', 'Code copied');
		window.setTimeout(() => {
			if (!button.isConnected) return;
			button.textContent = 'Copy';
			button.setAttribute('aria-label', 'Copy code');
		}, COPY_FEEDBACK_DURATION_MS);
	} catch {
		// Clipboard access can be disabled by the webview host. Keep the code selectable.
	}
};
