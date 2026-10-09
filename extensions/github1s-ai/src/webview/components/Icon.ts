import { html } from 'htm/preact';

const ICON_PATHS = {
	add: 'M8 1.5a.5.5 0 0 0-1 0V7H1.5a.5.5 0 0 0 0 1H7v5.5a.5.5 0 0 0 1 0V8h5.5a.5.5 0 0 0 0-1H8z',
	'arrow-left': 'M6.7 3.3 2 8l4.7 4.7.8-.8-3.3-3.3H14V7.4H4.2l3.3-3.3z',
	check: 'M13.2 4.3 6.5 11 2.8 7.3l.8-.8 2.9 2.9 5.9-5.9z',
	'chevron-right': 'M5.7 3.3 10.4 8l-4.7 4.7-.8-.8L8.8 8 4.9 4.1z',
	close: 'M4 4l8 8m0-8-8 8',
	download: 'M7.5 1h1v8.1l2.8-2.8.7.7-4 4-4-4 .7-.7 2.8 2.8zM2 12h1v2h10v-2h1v3H2z',
	edit: 'M10.9 2.1a2.1 2.1 0 0 1 3 3L6 13q-.5.5-1.1.6l-3.4.9.9-3.4q.1-.6.6-1.1zM10.1 3.6l2.3 2.3',
	file: 'M3 1h6l4 4v10H3zm6 1.4V5h2.6zM4 2v12h8V6H8V2z',
	history: 'M8 1a7 7 0 1 1-6.7 9h1.06a6 6 0 1 0 .44-5H5v1H1V2h1v2.4A7 7 0 0 1 8 1m-.5 3h1v4.2l2.85 1.65-.5.86L7.5 8.8z',
	refresh: 'M8 1a7 7 0 1 1-6.7 9h1.06a6 6 0 1 0 .44-5H5v1H1V2h1v2.4A7 7 0 0 1 8 1',
	repo: 'M2 2h5l1 2h6v10H2zm1 1v10h10V5H7.4l-1-2z',
	selection: 'M2 2h4v1H3v3H2zm8 0h4v4h-1V3h-3zm-8 8h1v3h3v1H2zm11 0h1v4h-4v-1h3z',
	send: 'M8 2.5 3.5 7l.8.8 3.1-3.1V14h1.2V4.7l3.1 3.1.8-.8z',
	sparkle: 'm8 1.5 1.35 5.15L14.5 8 9.35 9.35 8 14.5 6.65 9.35 1.5 8l5.15-1.35z',
	stop: 'M4 4h8v8H4z',
	terminal: 'M2 3h12v10H2zm1 1v8h10V4zm1.5 2 .7-.7L7.9 8l-2.7 2.7-.7-.7 2-2zm4 4H12v1H8.5z',
	trash: 'M5 2h6l.5 1.5H14v1H2v-1h2.5zM4 6h1l.5 7h5l.5-7h1l-.6 8H4.6z',
	warning: 'M8 1.5 15 14H1zm0 2.3L2.9 13h10.2zm-.6 2.7h1.2v3.8H7.4zm0 5h1.2v1.2H7.4z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
	name: IconName;
	className?: string;
}

export const Icon = ({ name, className }: IconProps) => {
	const stroked = name === 'close' || name === 'edit';
	return html`<svg
		class=${className ? `icon ${className}` : 'icon'}
		viewBox="0 0 16 16"
		aria-hidden="true"
		focusable="false"
	>
		<path
			d=${ICON_PATHS[name]}
			fill=${stroked ? 'none' : undefined}
			stroke=${stroked ? 'currentColor' : undefined}
			stroke-linecap=${stroked ? 'round' : undefined}
			stroke-linejoin=${stroked ? 'round' : undefined}
		/>
	</svg>`;
};
