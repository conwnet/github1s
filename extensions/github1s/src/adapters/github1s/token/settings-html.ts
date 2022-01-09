/**
 * @file github1s settings html
 * @author netcon
 */

import { getNonce } from '@/helpers/util';

export const getSettingsHtml = () => {
	const nonce = getNonce();

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>GitHub1s Settings</title>
	<style nonce="${nonce}">
html {
	box-sizing: border-box;
	font-size: 13px;
}

*,
*:before,
*:after {
	box-sizing: inherit;
}

body, h1, h2, h3, h4, h5, h6, p, ol, ul {
	margin: 0;
	padding: 0;
	font-weight: normal;
}

body {
	background-color: transparent;
}

input {
	display: block;
	width: 100%;
	height: 24px;
	border: none;
	margin-bottom: 10px;
	padding-left: 4px;
	padding-right: 4px;
	font-family: var(--vscode-font-family);
	color: var(--vscode-input-foreground);
	outline-color: var(--vscode-input-border);
	background-color: var(--vscode-input-background);
}

button {
	border: none;
	width: 100%;
	height: 26px;
	margin-bottom: 10px;
	padding: var(--input-padding-vertical) var(--input-padding-horizontal);
	text-align: center;
	outline: 1px solid transparent;
	outline-offset: 2px !important;
	color: var(--vscode-button-foreground);
	background: var(--vscode-button-background);
}

button:hover {
	cursor: pointer;
	background: var(--vscode-button-hoverBackground);
}

button:focus {
	outline-color: var(--vscode-focusBorder);
}

button.secondary {
	color: var(--vscode-button-secondaryForeground);
	background: var(--vscode-button-secondaryBackground);
}

button.secondary:hover {
	background: var(--vscode-button-secondaryHoverBackground);
}

.loading-page {
	width: 50px;
	height: 40px;
	margin: 60px auto;
	text-align: center;
}

.loading-page span {
	width: 5px;
	height: 100%;
	margin-right: 4px;
	display: inline-block;
	background:#2b6298;
	animation: loading 1.2s infinite ease-in-out;
	-webkit-animation: loading 1.2s infinite ease-in-out;
}

.loading-page >span:nth-child(2) {
	-webkit-animation-delay: -1.0s;
	animation-delay: -1.0s;
}

.loading-page >span:nth-child(3) {
	-webkit-animation-delay: -0.9s;
	animation-delay: -0.9s;
}

.loading-page >span:nth-child(4) {
	-webkit-animation-delay: -0.8s;
	animation-delay: -0.8s;
}

.loading-page >span:nth-child(5) {
	-webkit-animation-delay: -0.7s;
	animation-delay: -0.7s;
}

@keyframes loading {
	0% { transform: scaleY(0.4); }
	25% { transform: scaleY(1.0); }
	50% { transform: scaleY(0.4); }
	75% { transform: scaleY(0.4); }
	100% { transform: scaleY(0.4); }
}

.preview-page, .edit-page {
	display: none;
}

.container {
	padding: 10px;
}

.container .token-invalid {
	display: none;
}

.page-title {
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 10px;
}

.description {
	margin-bottom: 10px;
}

.description div {
	margin-bottom: 5px;
}

.description div:last-child {
	margin-bottom: 0;
}

.authorizing-method-block {
	margin-bottom: 8px;
}

.authorizing-method-title {
	margin-bottom: 8px;
}

.token-link {
	margin-bottom: 10px;
}
	</style>
</head>
<body>
	<div class="loading-page">
		<span></span><span></span><span></span><span></span><span></span>
	</div>
	<div class="container edit-page">
		<div class="page-title">Set OAuth Token</div>
		<div class="description">
			<div>For unauthenticated requests, the rate limit of GitHub allows for up to 60 requests per hour.</div>
			<div>For API requests using Authentication, you can make up to 5,000 requests per hour.</div>
		</div>
		<div class="authorizing-method-block">
			<h3 class="authorizing-method-title">Authorizing OAuth App</h3>
			<div><button id="authorizing-button">Connect to GitHub</button></div>
		</div>
		<div class="authorizing-method-block">
			<h3 class="authorizing-method-title">Use OAuth Token</h3>
			<div class="token-link">
				<a href="https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s" target="_blank">
					Generate New OAuth Token
				</a>
			</div>
			<div><input id="token-input" name="token" autocomplete="off" /></div>
			<div><button id="save-button">Save</button></div>
		</div>
		<div><button id="preview-button">Cancel</button></div>
	</div>
	<div class="container preview-page">
		<div class="page-title">You have authenticated</div>
		<div class="description">
			<div class="token-status">
				Current OAuth Token is <span class="token-status-text"> ...</span>.
			</div>
			<div id="token-text"></div>
		</div>
		<div><button id="detail-button">Detail</button></div>
		<div><button id="validate-button">Validate</button></div>
		<div><button id="edit-button">Edit</button></div>
		<div><button id="clear-button">Clear</button></div>
	</div>
	<script nonce="${nonce}">
(function () {
	const vscode = acquireVsCodeApi();

	const updateState = (state) => {
		const prevState = vscode.getState();
		vscode.setState({ ...prevState, ...state });
		updatePage();
	};

	window.addEventListener('message', ({ data }) => {
		if (data && data.type === 'update-state') {
			updateState(data.payload);
		}
	});
	vscode.postMessage({ type: 'initialization', payload: null });

	const delegate = (element, selector, eventName, handler) => {
		if (!element) return null;
		element.addEventListener(eventName, function (event) {
			const children = element.querySelectorAll(selector);
			for (let i = 0, len = children.length; i < len; i++) {
				if (children[i] === event.target) {
					handler.call(this, event);
				}
			}
		});
	};

	delegate(document.body, '#save-button', 'click', () => {
		const tokenInput = document.getElementById('token-input');
		vscode.postMessage({ type: 'update-token', payload: tokenInput ? tokenInput.value : '' });
	});

	delegate(document.body, '#preview-button', 'click', () => {
		updateState({ pageType: 'PREVIEW' });
	});

	delegate(document.body, '#validate-button', 'click', () => {
		const state = vscode.getState();
		vscode.postMessage({ type: 'validate-token', payload: state ? state.token : '' });
	});

	delegate(document.body, '#edit-button', 'click', () => {
		updateState({ pageType: 'EDIT' });
	});

	delegate(document.body, '#clear-button', 'click', () => {
		vscode.postMessage({ type: 'clear-token' });
	});

	delegate(document.body, '#detail-button', 'click', () => {
		vscode.postMessage({ type: 'detail-page' });
	});

	delegate(document.body, '#authorizing-button', 'click', () => {
		vscode.postMessage({ type: 'authorizing-github' })
	});

	const updatePage = () => {
		const { token, pageType, valid, validating } = vscode.getState() || { token: '', preview: 'EDIT', valid: true, validating: true };
		if (validating) {
			document.querySelector('.loading-page').style.display = 'block';
			document.querySelector('.preview-page').style.display = 'none';
			document.querySelector('.edit-page').style.display = 'none';
			return;
		}

		if (pageType === 'EDIT') {
			document.querySelector('.loading-page').style.display = 'none';
			document.querySelector('.preview-page').style.display = 'none';
			document.querySelector('.edit-page').style.display = 'block';
			document.querySelector('#preview-button').style.display = (token ? 'block' : 'none');
			return;
		}

		document.querySelector('.loading-page').style.display = 'none';
		document.querySelector('.edit-page').style.display = 'none';
		document.querySelector('.preview-page').style.display = 'block';
		document.querySelector('.container .token-status .token-status-text').innerText = (valid ? ' VALID' : ' INVALID');
		document.querySelector('#token-text').innerText = token.slice(0, 7) + token.slice(7).replace(/./g, '*');
		document.querySelector('#token-text').style.color = (valid ? '#73c991' : '#f88070');
	};
})();
	</script>
</body>
</html>
`;
};
