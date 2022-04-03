import { render } from 'https://unpkg.com/preact@latest?module';
import { useState, useCallback, useEffect } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import { html, VscodeButton, VscodeInput, VscodeLink, sendMessage } from './components.js';

const OpenAuthPageBlock = ({ onTokenChange, ...props }) => {
	const [loading, setLoading] = useState(false);
	const handleClick = useCallback(() => {
		setLoading(true);
		sendMessage({ type: 'open-github-auth-page' }).then((token) => {
			onTokenChange(token);
			setLoading(false);
		});
	}, [onTokenChange]);

	return html`
		<div class="authentication-method-block" ...${props}>
			<h3 class="authentication-method-title">Authenticating OAuth App</h3>
			<div class="flex-line">
				<${VscodeButton} loading=${loading} onClick=${handleClick}>Connect to GitHub<//>
			</div>
		</div>
	`;
};

const EditTokenDescription = () => {
	return html`
		<div class="description">
			<div>For unauthenticated requests, the rate limit of GitHub allows for up to 60 requests per hour.</div>
			<div>For API requests using Authentication, you can make up to 5,000 requests per hour.</div>
		</div>
	`;
};

const TokenEditForm = ({ onTokenChange, ...props }) => {
	const createTokenLink = 'https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s';
	const [inputToken, setInputToken] = useState('');
	const [loading, setLoading] = useState(false);
	const handleInputTokenChange = useCallback((event) => {
		setInputToken(event.target.value);
	}, []);
	const handleSubmit = useCallback(() => {
		if (inputToken) {
			setLoading(true);
			sendMessage({ type: 'validate-token', data: inputToken }).then((tokenStatus) => {
				setLoading(false);
				if (!tokenStatus) {
					sendMessage({
						type: 'call-vscode-message-api',
						data: { level: 'info', args: ['This OAuth Token is INVALID'] },
					});
					return;
				}
				onTokenChange(inputToken);
			});
		}
	}, [onTokenChange, inputToken]);

	return html`
		<div class="authentication-method-block" ...${props}>
			<h3 class="authentication-method-title">Use OAuth Token</h3>
			<div class="create-token-link">
				<${VscodeLink} to=${createTokenLink} external> Generate New OAuth Token <//>
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

const TokenEditPage = ({ token, onCancel, onTokenChange, ...props }) => {
	const cancelButton = token ? html`<${VscodeButton} onClick=${onCancel}>Cancel<//>` : '';
	return html`
		<div class="token-edit-page" ...${props}>
			<div class="page-title">Set OAuth Token</div>
			<${EditTokenDescription} />
			<${OpenAuthPageBlock} onTokenChange=${onTokenChange} />
			<${TokenEditForm} onTokenChange=${onTokenChange} />
			<div class="flex-line">${cancelButton}</div>
		</div>
	`;
};

const TokenDetailPage = ({ token, onClearClick, onEditClick, ...props }) => {
	const displayToken = token.slice(0, 7) + '*********************************';
	const [tokenStatus, setTokenStatus] = useState(null);
	const [validating, setValidating] = useState(true);

	const tokenStatusText = validating ? '...' : tokenStatus ? 'VALID' : 'INVALID';
	const tokenClasses = `token-text ${validating ? '' : tokenStatus ? 'token-valid' : 'token-invalid'}`;

	const handleDetailClick = useCallback(() => {
		sendMessage({ type: 'open-detail-page' });
	}, []);

	const validateToken = useCallback((token) => {
		setValidating(true);
		return sendMessage({ type: 'validate-token', data: token }).then((tokenStatus) => {
			setValidating(false);
			setTokenStatus(tokenStatus);
		});
	}, []);

	const handleValidateClick = useCallback(() => {
		validateToken(token).then((tokenStatus) => {
			const statusMessage = `Current OAuth Token is ${tokenStatus ? 'VALID' : 'INVALID'}`;
			sendMessage({
				type: 'call-vscode-message-api',
				data: {
					level: 'info',
					args: [statusMessage],
				},
			});
		});
	}, [validateToken, token]);

	const handleClearClick = useCallback(() => {
		sendMessage({
			type: 'call-vscode-message-api',
			data: {
				level: 'warning',
				args: ['Would you want to clear the saved GitHub OAuth Token?', { modal: true }, 'Confirm'],
			},
		}).then((choose) => choose === 'Confirm' && onClearClick());
	}, [onClearClick]);

	useEffect(() => {
		token && validateToken(token);
	}, [token, validateToken]);

	return html`
		<div class="token-detail-page" ${props}>
			<div class="page-title">You have authenticated</div>
			<div class="description">
				<div class="token-status">
					Current OAuth Token is <span class="token-status-text">${tokenStatusText}</span>.
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

	const handleTokenSet = useCallback((token) => {
		sendMessage({ type: 'set-token', data: token }).then(() => {
			setToken(token);
			setPageType(token ? 'DETAIL' : 'EDIT');
		});
	}, []);

	const handleClearClick = useCallback(() => {
		return handleTokenSet('');
	}, [handleTokenSet]);

	const handleTokenChange = useCallback((token) => {
		setToken(token);
		setLoading(false);
		setPageType(token ? 'DETAIL' : 'EDIT');
	}, []);

	useEffect(() => {
		sendMessage({ type: 'get-token' }).then((token) => {
			handleTokenChange(token);
			const loadingElement = document.getElementById('page-loading');
			loadingElement.parentNode.removeChild(loadingElement);
		});
	}, [handleTokenChange]);

	useEffect(() => {
		const handler = ({ data }) => {
			if (data.type === 'token-changed') {
				handleTokenChange(data.token);
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, [handleTokenChange]);

	if (loading) {
		return null;
	}

	if (pageType === 'DETAIL') {
		return html`<${TokenDetailPage} token=${token} onEditClick=${switchToEdit} onClearClick=${handleClearClick} />`;
	}

	return html`<${TokenEditPage} token=${token} onTokenChange=${handleTokenSet} onCancel=${switchToDetail} />`;
};

render(html`<${App} />`, document.getElementById('app'));
