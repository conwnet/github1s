import { h } from './preact.module.js';
import htm from './htm.module.js';

export const html = htm.bind(h);

export const VscodeButton = ({ size, loading, ...props }) => {
	const sizeClass = `size-${size || 'small'}`;
	const loadingClass = loading ? 'loading' : '';
	const classes = `vscode-button ${sizeClass} ${loadingClass}`;

	return html`<button class=${classes} disabled=${loading} ...${props} />`;
};

export const VscodeInput = ({ size, ...props }) => {
	const classes = `vscode-input size-${size || 'small'}`;

	return html`<input class=${classes} ...${props} />`;
};

export const VscodeTextarea = (props) => {
	return html` <textarea class="vscode-textarea" ...${props} /> `;
};

export const VscodeLoading = ({ blockWidth, blockSpacing, ...props }) => {
	const _blockWidth = blockWidth || '5px';
	const _blockSpacing = blockSpacing || '4px';
	const styleStr = `width: ${_blockWidth}; margin-right: ${_blockSpacing}`;
	const blocks = Array.from({ length: 5 }).map(() => html`<span style=${styleStr} />`);

	return html`<div class="vscode-loading" ...${props}>${blocks}</div>`;
};

export const VscodeLink = ({ to, external, ...props }) => {
	const hrefProp = to ? { href: to } : {};
	const roleProp = to ? {} : { role: 'button' };
	const targetProp = external ? { target: '_blank' } : {};
	const combineProps = { ...hrefProp, ...roleProp, ...targetProp };

	return html` <a class="vscode-link" ...${combineProps} ...${props} /> `;
};

export const postMessage = (() => {
	const vscode = window.acquireVsCodeApi();
	const uniqueId = ((id) => () => id++)(1);
	const messageMap = new Map();

	window.addEventListener('message', ({ data }) => {
		messageMap.has(data.id) && messageMap.get(data.id)(data.data);
	});

	return (type, data) => {
		const messageId = uniqueId();
		vscode.postMessage({ type, data, id: messageId });
		return new Promise((resolve) => {
			messageMap.set(messageId, resolve);
		});
	};
})();
