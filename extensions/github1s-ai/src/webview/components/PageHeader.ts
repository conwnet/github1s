import { html } from 'htm/preact';

import { Icon } from './Icon';

interface PageHeaderProps {
	title: string;
	backLabel: string;
	onBack: () => void;
}

export const PageHeader = ({ title, backLabel, onBack }: PageHeaderProps) => html`
	<header class="page-header">
		<button class="icon-button" type="button" aria-label=${backLabel} title=${backLabel} onClick=${onBack}>
			<${Icon} name="arrow-left" />
		</button>
		<h2>${title}</h2>
	</header>
`;
