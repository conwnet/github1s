import { render } from './libraries/preact.module.js';
import { useState, useCallback, useEffect } from './libraries/preact-hooks.module.js';
import { html, VscodeButton, VscodeInput, VscodeLink, VscodeLoading, bridgeCommands } from './components.js';

const pageConfig = window.pageConfig || {};

export const PageHeader = ({ title, children, ...props }) => {
	return html`<div ...${props}>
		<div class="page-title">${title}</div>
		<div class="page-description">${children}</div>
	</div>`;
};

export const OAuthBlock = ({ buttonText, command, ...props }) => {
	const [loading, setLoading] = useState(false);
	const handleButtonClick = useCallback(() => {
		setLoading(true);
		bridgeCommands.OAuthAuthenticate().then(() => setLoading(false));
	}, []);

	return html`
		<div class="content-block" ...${props}>
			<h3 class="content-block-title">Authenticating OAuth App</h3>
			<div class="flex-line">
				<${VscodeButton} loading=${loading} onClick=${handleButtonClick}>${buttonText}<//>
			</div>
		</div>
	`;
};

export const InputTokenBlock = ({ createLink, isEditing, onCancel, ...props }) => {
	const [inputToken, setInputToken] = useState('');
	const [loading, setLoading] = useState(false);
	const handleInputTokenChange = useCallback((event) => {
		setInputToken(event.target.value);
	}, []);

	const handleSubmit = useCallback(() => {
		if (inputToken) {
			setLoading(true);
			bridgeCommands.validateToken(inputToken).then((tokenStatus) => {
				if (!tokenStatus) {
					const messageArgs = { level: 'info', args: ['This AccessToken is invalid'] };
					bridgeCommands.alertMessage(messageArgs);
					setLoading(false);
					return;
				}
				bridgeCommands.setToken(inputToken).then(() => setLoading(false));
			});
		}
	}, [inputToken]);

	return html`
		<div class="input-token-block" ...${props}>
			<h3 class="input-token-block-title">Manual Input AccessToken</h3>
			<div class="create-token-link">
				<${VscodeLink} to=${createLink} external>Create New AccessToken <//>
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
			${isEditing
				? html`<div class="flex-line">
						<${VscodeButton} onClick=${onCancel}>Cancel<//>
					</div>`
				: null}
		</div>
	`;
};

export const TokenDetailBlock = ({ token, validating, onEditClick, validateToken, ...props }) => {
	const handleValidateClick = useCallback(() => {
		validateToken(token).then((tokenStatus) => {
			const statusMessage = `Current AccessToken is ${tokenStatus ? 'VALID' : 'INVALID'}`;
			const messageArgs = { level: 'info', args: [statusMessage] };
			bridgeCommands.alertMessage(messageArgs);
		});
	}, [validateToken, token]);

	const handleClearClick = useCallback(() => {
		const messageArgs = {
			level: 'warning',
			args: ['Would you want to clear the saved this AccessToken?', { modal: true }, 'Confirm'],
		};
		bridgeCommands.alertMessage(messageArgs).then((choose) => choose === 'Confirm' && bridgeCommands.setToken(''));
	}, []);

	return html`
		<div class="token-detail-block" ${props}>
			<div class="flex-line"><${VscodeButton} onClick=${bridgeCommands.openDetailPage}>Detail<//></div>
			<div class="flex-line"><${VscodeButton} loading=${validating} onClick=${handleValidateClick}>Validate<//></div>
			<div class="flex-line"><${VscodeButton} onClick=${onEditClick}>Edit<//></div>
			<div class="flex-line"><${VscodeButton} onClick=${handleClearClick}>Clear<//></div>
		</div>
	`;
};

const PageFooter = () => {
	const [preferSgApi, setPreferSgApi] = useState(false);

	const updatePreferSgApi = useCallback(() => {
		bridgeCommands.getPreferSgApi().then((value) => {
			setPreferSgApi(value);
		});
	}, []);

	const handleCheckboxChange = useCallback(
		(event) => {
			bridgeCommands.setPreferSgApi(event.target.checked).then(() => {
				updatePreferSgApi();
			});
		},
		[updatePreferSgApi],
	);

	useEffect(() => {
		const handler = ({ data }) => {
			if (data.type === 'prefer-sourcegraph-api-changed') {
				updatePreferSgApi();
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, []);

	useEffect(() => {
		updatePreferSgApi();
	}, [updatePreferSgApi]);

	return html`
		<div class="page-footer">
			<input type="checkbox" checked=${preferSgApi} onChange=${handleCheckboxChange} />
			<span>Prefer to use Sourcegraph API</span>
		</div>
	`;
};

const TokenEditPage = ({ token, onCancel, ...props }) => {
	const pageDescription = (pageConfig.pageDescriptionLines || []).map((line) => html`<div>${line}</div>`);

	return html`
		<div class="token-edit-page" ...${props}>
			<${PageHeader} title="Set AccessToken">${pageDescription}<//>
			<${OAuthBlock} buttonText=${pageConfig.OAuthButtonText} command=${pageConfig.OAuthCommand} />
			<${InputTokenBlock} createLink=${pageConfig.createTokenLink} isEditing=${!!token} onCancel=${onCancel} />
		</div>
	`;
};

const TokenDetailPage = ({ token, onEditClick, ...props }) => {
	const [tokenStatus, setTokenStatus] = useState(null);
	const [validating, setValidating] = useState(true);

	const validateToken = useCallback((token) => {
		setValidating(true);
		return bridgeCommands.validateToken(token).then((tokenStatus) => {
			setValidating(false);
			setTokenStatus(tokenStatus);
			return tokenStatus;
		});
	}, []);

	const validateResult = tokenStatus
		? html`<div class="login-text">
				<span>Logged in as</span>
				<a href=${tokenStatus.profile_url} target="_blank" rel="noopener noreferrer">
					<img class="user-avatar" src=${tokenStatus.avatar_url} />${tokenStatus.username}
				</a>
			</div>`
		: html`<div>Current AccessToken is <span class="error-text">INVALID</span>.</div>`;

	useEffect(() => {
		token && validateToken(token);
	}, [token, validateToken]);

	return html`
		<div class="token-detail-page" ...${props}>
			<${PageHeader} title="You have authenticated">
				${validating ? html`<${VscodeLoading} dots=${8} align="left" style="height: 14px" />` : validateResult}
			<//>
			<${TokenDetailBlock}
				token=${token}
				validating=${validating}
				onEditClick=${onEditClick}
				validateToken=${validateToken}
			/>
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
		bridgeCommands.getToken().then((token) => {
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

	return html`
		<div>
			${pageType === 'DETAIL'
				? html`<${TokenDetailPage} token=${token} onEditClick=${switchToEdit} />`
				: html`<${TokenEditPage} token=${token} onCancel=${switchToDetail} />`}
			<${PageFooter} />
		</div>
	`;
};

const loadingElement = document.getElementById('page-loading');
loadingElement.parentNode.removeChild(loadingElement);
render(html`<${App} />`, document.getElementById('app'));
