import { html } from 'htm/preact';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'preact/hooks';

import { highlightCodeBlocks, type PostMarkdownHighlightRequest } from '../helpers/highlighting';
import { renderMarkdown } from '../helpers/markdown';

interface MarkdownProps {
	source: string;
	className?: string;
	post: PostMarkdownHighlightRequest;
}

interface MermaidBlock {
	source: string;
	element: HTMLElement;
	selected: boolean;
	update: () => void;
}

const COPY_FEEDBACK_DURATION_MS = 1_600;
let diagramSequence = 0;
let mermaidTheme: string | undefined;

export const Markdown = ({ source, className, post }: MarkdownProps) => {
	const markup = useMemo(() => renderMarkdown(source), [source]);
	const root = useRef<HTMLDivElement>(null);
	const diagramBlocks = useRef<MermaidBlock[]>([]);

	useEffect(() => {
		if (!root.current) return;
		return highlightCodeBlocks(root.current, post);
	}, [markup, post]);

	useLayoutEffect(() => {
		if (!root.current) return;
		return setupMermaidBlocks(root.current, diagramBlocks.current);
	}, [markup]);

	return html`<div
		ref=${root}
		class=${className ? `markdown ${className}` : 'markdown'}
		onClick=${copyCodeBlock}
		dangerouslySetInnerHTML=${{ __html: markup }}
	/>`;
};

const setupMermaidBlocks = (root: HTMLElement, diagramBlocks: MermaidBlock[]): (() => void) | undefined => {
	const blocks = root.querySelectorAll<HTMLElement>('code[data-code-language="mermaid"]');
	diagramBlocks.length = blocks.length;
	if (blocks.length === 0) return;
	for (const [index, code] of blocks.entries()) {
		const element = code.closest<HTMLElement>('.code-block');
		const pre = code.closest('pre');
		const copy = element?.querySelector('.code-copy');
		if (!element || !pre || !copy) continue;
		const source = code.textContent ?? '';
		const cached = diagramBlocks[index];
		if (cached?.source === source) {
			// Restore the existing diagram and controls before the browser paints the updated Markdown.
			element.replaceWith(cached.element);
			cached.update();
			continue;
		}
		const block: MermaidBlock = {
			source,
			element,
			selected: cached?.selected ?? false,
			update: () => void update(),
		};
		diagramBlocks[index] = block;
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
		let request: { theme: string; error: string } | undefined;
		let scrollPosition = { left: 0, top: 0 };
		diagram.onscroll = () => {
			if (!diagram.isConnected || diagram.hidden) return;
			scrollPosition = { left: diagram.scrollLeft, top: diagram.scrollTop };
		};
		const updateDiagramVisibility = () => {
			const visible = block.selected && diagram.childElementCount > 0;
			pre.hidden = visible;
			diagram.hidden = !visible;
			for (const button of zoomButtons) button.hidden = !visible;
			toggle.textContent = visible ? 'Source' : 'Diagram';
			toggle.title = request?.error || (visible ? 'Show source' : 'Show diagram');
			toggle.disabled = block.selected && !visible;
			if (visible) diagram.scrollTo(scrollPosition);
		};
		let zoom = 1;
		const updateZoom = (factor = 0) => {
			const svgElement = diagram.querySelector<SVGSVGElement>('svg');
			if (!svgElement) return;
			zoom = factor ? Math.min(4, Math.max(0.25, zoom * factor)) : 1;
			svgElement.style.width = `${zoom * 100}%`;
			const width = svgElement.viewBox.baseVal.width;
			if (width > 0) svgElement.style.maxWidth = `${width * zoom}px`;
			if (!factor) {
				scrollPosition = { left: 0, top: 0 };
				diagram.scrollTo(scrollPosition);
			}
		};
		const update = async () => {
			const isDark = document.body.matches('.vscode-dark, .vscode-high-contrast:not(.vscode-high-contrast-light)');
			const theme = isDark ? 'dark' : 'default';
			if (!block.selected || theme === request?.theme) {
				updateDiagramVisibility();
				return;
			}
			const currentRequest = (request = { theme, error: '' });
			updateDiagramVisibility();
			try {
				const { default: mermaid } = await import('mermaid');
				if (!code.isConnected || request !== currentRequest) return;
				if (theme !== mermaidTheme) {
					mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, theme });
					mermaidTheme = theme;
				}
				const { svg, bindFunctions } = await mermaid.render(`mermaid-${++diagramSequence}`, source);
				if (!code.isConnected || request !== currentRequest) return;
				diagram.innerHTML = svg;
				bindFunctions?.(diagram);
				updateZoom(1);
			} catch (error) {
				// Keep the source visible while a diagram is incomplete or invalid.
				if (!code.isConnected || request !== currentRequest) return;
				diagram.replaceChildren();
				block.selected = false;
				currentRequest.error = `Cannot render diagram: ${error instanceof Error ? error.message : String(error)}`;
				console.warn('Mermaid render failed', error);
			}
			updateDiagramVisibility();
		};
		controls.onclick = ({ target }) => {
			if (!(target instanceof HTMLButtonElement)) return;
			if (target === toggle) {
				block.selected = !block.selected;
				if (block.selected && request?.error) request = undefined;
				block.update();
			} else updateZoom(Number(target.value));
		};
		if (block.selected) {
			// The source changed while the diagram was open (streaming). Let it settle before rendering again.
			updateDiagramVisibility();
			window.setTimeout(block.update, 150);
		} else block.update();
	}
	const observer = new MutationObserver(() => {
		diagramBlocks.forEach((block) => block.update());
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
