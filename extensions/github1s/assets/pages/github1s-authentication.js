import { render } from './libraries/preact.module.js';
import { useState, useCallback, useEffect } from './libraries/preact-hooks.module.js';
import { html, VscodeButton, VscodeInput, VscodeLoading, VscodeLink, bridgeCommands } from './components.js';

const pageConfig = window.pageConfig || {};

const AuthenticationFeatures = () => {
	return html`
		<ul class="authentication-features">
			${(pageConfig.authenticationFeatures || []).map(
				(feature) =>
					html`<li class="feature-item">
						<a class="link" href=${feature.link} target="_blank" rel="noopener noreferrer">${feature.text}</a>
					</li>`,
			)}
		</ul>
	`;
};

const AuthenticationButton = (props) => {
	const [authenticating, setAuthenticating] = useState(false);

	const handleButtonClick = useCallback(() => {
		setAuthenticating(true);
		bridgeCommands.OAuthAuthenticate().then(() => setAuthenticating(false));
	}, []);

	const buttonLogoUrl = encodeURI(`${pageConfig.extensionUri}/${pageConfig.OAuthButtonLogo}`);
	return html`
		<button class="authentication-button" disabled="${authenticating}" onClick=${handleButtonClick} ...${props}>
			<span class=${'auth-button-logo'} style=${`background-image: url("${buttonLogoUrl}")`}></span>
			<span>${pageConfig.OAuthButtonText}</span>
		</button>
	`;
};

const ManualInputToken = () => {
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
		<div class="authentication-token">
			<div class="token-input-line">
				<${VscodeInput}
					autocomplete="off"
					value=${inputToken}
					disabled="${loading}"
					onInput=${handleInputTokenChange}
				/>
				<${VscodeButton} loading=${loading} onClick=${handleSubmit}>Submit<//>
			</div>
			<${VscodeLink} to="${pageConfig.createTokenLink}" external>Create New AccessToken<//>
		</div>
	`;
};

const SplitLine = () => {
	return html`<div class="split-line"></div>`;
};

const AuthenticationFooter = () => {
	return html`
		<div class="authentication-footer">
			<div>The access token will only store in your browser.</div>
			<div>Don't forget to clean it while you are using a device that doesn't belong to you.</div>
		</div>
	`;
};

const AuthenticationForm = () => {
	return html`
		<div class="authentication-form">
			<div class="form-title">${pageConfig.authenticationFormTitle}</div>
			<${AuthenticationFeatures} />
			<div class="form-content">
				<${AuthenticationButton} />
				<${SplitLine} />
				<${ManualInputToken} />
			</div>
			<${AuthenticationFooter} />
		</div>
	`;
};

const StatusNumberText = ({ count }) => {
	if (count <= 0) {
		return html`<span class="error-text">${count}</span>`;
	}
	if (count <= 99) {
		return html`<span class="warning-text">${count}</span>`;
	}

	return html`<span class="success-text">${count}</span>`;
};

const RateLimitsInfo = ({ info }) => {
	return html`<div>
		<ul class="rate-limit-info">
			<li>------- Rate Limit Info -------</li>
			<li>X-RateLimit-Limit: <${StatusNumberText} count=${info.limit} /></li>
			<li>X-RateLimit-Remaining: <${StatusNumberText} count=${info.remaining} /></li>
			<li>X-RateLimit-Used: ${info.used}</li>
			<li>X-RateLimit-Reset: ${info.reset}</li>
			<li>------------------------------</li>
			<li class="rate-limit-description">
				<span>Current rate limit window will reset after </span>
				<span>${Math.max(info.reset - Math.ceil(Date.now() / 1000), 0)}s</span>
			</li>
			<li>
				<${VscodeLink} to="${pageConfig.rateLimitDocLink}" external>${pageConfig.rateLimitDocLinkText}<//>
			</li>
		</ul>
	</div>`;
};

const AuthenticationDetail = ({ accessToken }) => {
	const [tokenStatus, setTokenStatus] = useState(null);
	const [validating, setValidating] = useState(true);

	const displayToken = accessToken.slice(0, 7) + '*********************************';
	const tokenClasses = `token-text ${validating ? '' : tokenStatus ? 'token-valid' : 'token-invalid'}`;

	const handleRefreshTokenStatus = useCallback(() => {
		setValidating(true);
		bridgeCommands
			.validateToken(accessToken)
			.then((tokenStatus) => setTokenStatus(tokenStatus))
			.finally(() => setValidating(false));
	}, [accessToken]);

	const handleClearToken = useCallback(() => {
		const messageArgs = {
			level: 'warning',
			args: ['Would you want to clear the saved this AccessToken?', { modal: true }, 'Confirm'],
		};
		bridgeCommands.alertMessage(messageArgs).then((choose) => choose === 'Confirm' && bridgeCommands.setToken(''));
	}, []);

	useEffect(() => {
		handleRefreshTokenStatus();
	}, [handleRefreshTokenStatus]);

	if (validating) {
		return html`<${VscodeLoading} />`;
	}

	return html`
		<div class="authentication-detail">
			<div class="detail-title">Authorization Detail</div>
			<div class="token-status">
				${tokenStatus
					? html`<div class="login-text">
							<span>Logged in as</span>
							<${VscodeLink} to=${tokenStatus.profile_url} external>
								<img class="user-avatar" src=${tokenStatus.avatar_url} />${tokenStatus.username}
							</a>
					  </div>`
					: html`<div>Current AccessToken is <span class="error-text">INVALID</span>.</div>`}
				<span class="refresh-button" onClick=${handleRefreshTokenStatus}>↻</span>
			</div>
			<div class=${tokenClasses}>${displayToken}</div>
			${tokenStatus && tokenStatus.rateLimits ? html`<${RateLimitsInfo} info=${tokenStatus.rateLimits} />` : null}
			<div class="token-operations">
				<${VscodeButton} size="middle" onClick=${handleClearToken}>Clear Access Token<//>
			</div>
			<${AuthenticationFooter} />
		</div>
	`;
};

const App = () => {
	const [loading, setLoading] = useState(true);
	const [accessToken, setAccessToken] = useState('');
	const [notice, setNotice] = useState('');

	useEffect(() => {
		bridgeCommands.getToken().then((token) => {
			setAccessToken(token);
			setLoading(false);
		});
		bridgeCommands.getNotice().then((notice) => setNotice(notice));
	}, []);

	useEffect(() => {
		const handler = ({ data }) => {
			if (data.type === 'token-changed') {
				setAccessToken(data.token);
				bridgeCommands.getNotice().then((notice) => setNotice(notice));
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, [setAccessToken]);

	if (loading) {
		return html`<${VscodeLoading} />`;
	}

	return html`
		<div class="authentication-page">
			${notice ? html`<div class="page-notice">${notice}</div>` : null}
			<${accessToken ? AuthenticationDetail : AuthenticationForm} accessToken=${accessToken} />
		</div>
	`;
};

const loadingElement = document.getElementById('page-loading');
loadingElement.parentNode.removeChild(loadingElement);
render(html`<${App} />`, document.getElementById('app'));
