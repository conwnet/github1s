import { html } from 'htm/preact';
import type { VNode } from 'preact';

import { contextReferencePath, fileName, type ContextReference } from '@/common/context';

import { Tooltip } from './Tooltip';

interface RecentFilesTooltipProps {
	files: readonly ContextReference[];
	hint?: string;
	children: VNode;
}

export const RecentFilesTooltip = ({ files, hint, children }: RecentFilesTooltipProps) => {
	const content = html`<div class="tooltip-content">
		<div><strong>Recent files: </strong><span class="tooltip-hint">${files.length}</span></div>
		${files.length > 0
			? html`<ul>
					${files.map((file) => html`<li key=${file.source}>${fileName(contextReferencePath(file))}</li>`)}
				</ul>`
			: html`<div class="tooltip-hint">No recent files</div>`}
		${hint ? html`<div class="tooltip-hint">${hint}</div>` : null}
	</div>`;
	return html`<${Tooltip} content=${content}>${children}<//>`;
};
