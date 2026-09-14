import { html } from 'htm/preact';
import { cloneElement, type ComponentChildren, type HTMLAttributes, type VNode } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';

interface TooltipProps {
	content: ComponentChildren;
	children: VNode;
}

// Wrap one DOM element; keep its accessible name and attach the tooltip as its description.
export const Tooltip = ({ content, children }: TooltipProps) => {
	const id = useId();
	const anchor = useRef<HTMLSpanElement>(null);
	const tooltip = useRef<HTMLDivElement>(null);
	const timer = useRef<number>();
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState({ left: 0, top: 0 });

	const show = (event: MouseEvent | FocusEvent, delay: number) => {
		window.clearTimeout(timer.current);
		// A nested tooltip takes precedence over its enclosing tooltip.
		if (event.target instanceof Element && event.target.closest('.tooltip-anchor') !== anchor.current) {
			setOpen(false);
			return;
		}
		timer.current = window.setTimeout(() => setOpen(true), delay);
	};
	const hide = () => {
		window.clearTimeout(timer.current);
		// Allow the pointer to cross the gap and read the tooltip without dismissing it.
		timer.current = window.setTimeout(() => {
			if (
				!anchor.current?.matches(':hover') &&
				!anchor.current?.querySelector(':focus-visible') &&
				!tooltip.current?.matches(':hover')
			) {
				setOpen(false);
			}
		}, 100);
	};

	useEffect(() => () => window.clearTimeout(timer.current), []);

	useLayoutEffect(() => {
		if (!open || !anchor.current || !tooltip.current) return;
		const rect = anchor.current.getBoundingClientRect();
		const { width, height } = tooltip.current.getBoundingClientRect();
		const margin = 8;
		const top = rect.top - height - 6;
		setPosition({
			left: Math.max(margin, Math.min(rect.left + (rect.width - width) / 2, window.innerWidth - width - margin)),
			top: Math.max(margin, Math.min(top >= margin ? top : rect.bottom + 6, window.innerHeight - height - margin)),
		});
	}, [open, content]);

	useEffect(() => {
		if (!open) return;
		const dismiss = () => {
			window.clearTimeout(timer.current);
			setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') dismiss();
		};
		const onScroll = (event: Event) => {
			if (!(event.target instanceof Node) || !tooltip.current?.contains(event.target)) dismiss();
		};
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', dismiss);
		window.addEventListener('blur', dismiss);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', dismiss);
			window.removeEventListener('blur', dismiss);
		};
	}, [open]);

	return html`<span
		ref=${anchor}
		class="tooltip-anchor"
		onMouseOver=${(event: MouseEvent) => show(event, 150)}
		onMouseLeave=${hide}
		onFocus=${(event: FocusEvent) => show(event, 0)}
		onBlur=${hide}
	>
		${cloneElement(children, { 'aria-describedby': open ? id : undefined })}
		${open
			? createPortal(
					html`<div
						ref=${tooltip}
						id=${id}
						class="tooltip"
						role="tooltip"
						style=${position}
						onMouseEnter=${() => window.clearTimeout(timer.current)}
						onMouseLeave=${hide}
					>
						${content}
					</div>`,
					document.body,
				)
			: null}
	</span>`;
};

interface TooltipButtonProps extends HTMLAttributes<HTMLButtonElement> {
	label: string;
}

export const TooltipButton = ({ label, children, ...props }: TooltipButtonProps) => html`
	<${Tooltip} content=${label}>
		<button type="button" aria-label=${label} ...${props}>${children}</button>
	<//>
`;
