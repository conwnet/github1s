import { render } from './preact.module.js';
import { useState, useCallback, useEffect } from './preact-hooks.module.js';
import { html, VscodeButton, VscodeInput, VscodeLink, VscodeLoading, postMessage } from './components.js';

const EditTokenDescription = () => {
	return html`
		<div class="description">
			<div>For unauthenticated requests, the rate limit of GitHub allows for up to 60 requests per hour.</div>
			<div>For API requests using Authentication, you can make up to 5,000 requests per hour.</div>
		</div>
	`;
};

const ConnectToGitHubBlock = (props) => {
	const [loading, setLoading] = useState(false);
	const handleButtonClick = useCallback(() => {
		setLoading(true);
		postMessage('connect-to-github').then(() => setLoading(false));
	}, []);

	return html`
		<div class="authentication-method-block" ...${props}>
			<h3 class="authentication-method-title">Authenticating OAuth App</h3>
			<div class="flex-line">
				<${VscodeButton} loading=${loading} onClick=${handleButtonClick}>Connect to GitHub<//>
			</div>
		</div>
	`;
};

const ManualInputTokenBlock = ({ onTokenChange, ...props }) => {
	const createTokenLink = 'https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s';
	const [inputToken, setInputToken] = useState('');
	const [loading, setLoading] = useState(false);
	const handleInputTokenChange = useCallback((event) => {
		setInputToken(event.target.value);
	}, []);

	const handleSubmit = useCallback(() => {
		if (inputToken) {
			setLoading(true);
			postMessage('validate-token', inputToken).then((tokenStatus) => {
				if (!tokenStatus) {
					const messageArgs = { level: 'info', args: ['This AccessToken is invalid'] };
					postMessage('call-vscode-message-api', messageArgs);
					setLoading(false);
					return;
				}
				postMessage('set-token', inputToken).then(() => setLoading(false));
			});
		}
	}, [inputToken]);

	return html`
		<div class="authentication-method-block" ...${props}>
			<h3 class="authentication-method-title">Manual Input AccessToken</h3>
			<div class="create-token-link">
				<${VscodeLink} to=${createTokenLink} external> Generate New AccessToken <//>
			</div>
			<div class="flex-line">
				<${VscodeInput}
					autocomplete="off"
					value=${inputToken}
					disabled="${loading}"
					onInput=${handleInputTokenChange}
				/>
			</div>
			<div class="flex-line">
				<${VscodeButton} loading=${loading} onClick=${handleSubmit}>Submit<//>
			</div>
		</div>
	`;
};

const TokenEditPage = ({ token, onCancel, ...props }) => {
	const cancelButton = token ? html`<${VscodeButton} onClick=${onCancel}>Cancel<//>` : '';

	return html`
		<div class="token-edit-page" ...${props}>
			<div class="page-title">Set AccessToken</div>
			<${EditTokenDescription} />
			<${ConnectToGitHubBlock} />
			<${ManualInputTokenBlock} />
			<div class="flex-line">${cancelButton}</div>
		</div>
	`;
};

const TokenDetailPage = ({ token, onEditClick, ...props }) => {
	const displayToken = token.slice(0, 7) + '*********************************';
	const [tokenStatus, setTokenStatus] = useState(null);
	const [validating, setValidating] = useState(true);

	const tokenStatusText = validating ? '...' : tokenStatus ? 'VALID' : 'INVALID';
	const tokenClasses = `token-text ${validating ? '' : tokenStatus ? 'token-valid' : 'token-invalid'}`;

	const handleDetailClick = useCallback(() => postMessage('open-detail-page'), []);

	const validateToken = useCallback((token) => {
		setValidating(true);
		return postMessage('validate-token', token).then((tokenStatus) => {
			setValidating(false);
			setTokenStatus(tokenStatus);
		});
	}, []);

	const handleValidateClick = useCallback(() => {
		validateToken(token).then((tokenStatus) => {
			const statusMessage = `Current AccessToken is ${tokenStatus ? 'VALID' : 'INVALID'}`;
			const messageArgs = { level: 'info', args: [statusMessage] };
			postMessage('call-vscode-message-api', messageArgs);
		});
	}, [validateToken, token]);

	const handleClearClick = useCallback(() => {
		postMessage('call-vscode-message-api', {
			level: 'warning',
			args: ['Would you want to clear the saved GitHub AccessToken?', { modal: true }, 'Confirm'],
		}).then((choose) => choose === 'Confirm' && postMessage('set-token', ''));
	}, []);

	useEffect(() => {
		token && validateToken(token);
	}, [token, validateToken]);

	return html`
		<div class="token-detail-page" ${props}>
			<div class="page-title">You have authenticated</div>
			<div class="description">
				<div class="token-status">
					Current AccessToken is <span class="token-status-text">${tokenStatusText}</span>.
				</div>
				<div class=${tokenClasses}>${displayToken}</div>
			</div>
			<div class="flex-line"><${VscodeButton} onClick=${handleDetailClick}>Detail<//></div>
			<div class="flex-line"><${VscodeButton} loading=${validating} onClick=${handleValidateClick}>Validate<//></div>
			<div class="flex-line"><${VscodeButton} onClick=${onEditClick}>Edit<//></div>
			<div class="flex-line"><${VscodeButton} onClick=${handleClearClick}>Clear<//></div>
		</div>
	`;
};

const App = () => {
	const [loading, setLoading] = useState(true);
	const [pageType, setPageType] = useState('EDIT');
	const [token, setToken] = useState('');

	const switchToEdit = useCallback(() => setPageType('EDIT'), []);
	const switchToDetail = useCallback(() => setPageType('DETAIL'), []);

	useEffect(() => {
		postMessage('get-token').then((token) => {
			setToken(token);
			setLoading(false);
			setPageType(token ? 'DETAIL' : 'EDIT');
		});
	}, []);

	useEffect(() => {
		const handler = ({ data }) => {
			if (data.type === 'token-changed') {
				setToken(data.token);
				setPageType(data.token ? 'DETAIL' : 'EDIT');
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, []);

	if (loading) {
		return html`<${VscodeLoading} />`;
	}

	if (pageType === 'DETAIL') {
		return html`<${TokenDetailPage} token=${token} onEditClick=${switchToEdit} />`;
	}

	return html`<${TokenEditPage} token=${token} onCancel=${switchToDetail} />`;
};

const loadingElement = document.getElementById('page-loading');
loadingElement.parentNode.removeChild(loadingElement);
render(html`<${App} />`, document.getElementById('app'));
