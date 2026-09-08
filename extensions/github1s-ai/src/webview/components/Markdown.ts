import { html } from 'htm/preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';

import { highlightCodeBlocks, type PostMarkdownHighlightRequest } from '../helpers/highlighting';
import { renderMarkdown } from '../helpers/markdown';

interface MarkdownProps {
	source: string;
	className?: string;
	post: PostMarkdownHighlightRequest;
}

const COPY_FEEDBACK_DURATION_MS = 1_600;

export const Markdown = ({ source, className, post }: MarkdownProps) => {
	const markup = useMemo(() => renderMarkdown(source), [source]);
	const root = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!root.current) return;
		return highlightCodeBlocks(root.current, post);
	}, [markup, post]);

	return html`<div
		ref=${root}
		class=${className ? `markdown ${className}` : 'markdown'}
		onClick=${copyCodeBlock}
		dangerouslySetInnerHTML=${{ __html: markup }}
	/>`;
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
