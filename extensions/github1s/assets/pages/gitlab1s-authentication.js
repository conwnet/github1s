import { render } from './preact.module.js';
import { useState, useCallback, useEffect } from './preact-hooks.module.js';
import { html, VscodeButton, VscodeInput, VscodeLoading, VscodeLink, postMessage } from './components.js';

const AuthenticationFeatures = () => {
	return html`
		<ul class="authentication-features">
			<li class="feature-item">
				<a class="link" href="https://docs.gitlab.com/ee/api/#authentication" target="_blank"
					>Access GitLab personal repository</a
				>
			</li>
			<li class="feature-item">
				<a
					class="link"
					href="https://docs.gitlab.com/ee/user/gitlab_com/index.html#gitlabcom-specific-rate-limits"
					target="_blank"
					>Higher rate rimit for GitLab official API</a
				>
			</li>
		</ul>
	`;
};

const AuthenticationButton = (props) => {
	const [authenticating, setAuthenticating] = useState(false);

	const handleButtonClick = useCallback(() => {
		setAuthenticating(true);
		postMessage('connect-to-gitlab').then(() => setAuthenticating(false));
	}, []);

	return html`
		<button class="authentication-button" disabled="${authenticating}" onClick=${handleButtonClick} ...${props}>
			<svg
				class="github-logo"
				height="32"
				viewBox="65.72 65.72 368.55 368.55"
				xmlns="http://www.w3.org/2000/svg"
				style="padding: 9px;"
			>
				<path
					d="m365.32 272.52-31.561-108.04c-1.968-5.944-6.688-9.935-12.999-9.935-6.312 0-11.437 3.584-13.405 9.527l-20.905 62.76h-72.933l-20.905-62.731c-1.968-5.942-7.093-9.528-13.406-9.528-6.311 0-11.435 3.963-12.999 9.937l-31.53 108.01c-1.188 3.964 0.405 8.333 3.562 10.722l111.58 84.204 111.96-84.204c3.127-2.359 4.719-6.731 3.533-10.722z"
				/>
				<path
					d="m250 65.722c-101.62 0-184.28 82.661-184.28 184.28 0 101.62 82.662 184.28 184.28 184.28s184.28-82.663 184.28-184.28c0-101.62-82.659-184.28-184.28-184.28zm0 30.712c85 0 153.56 68.564 153.56 153.56 0 84.999-68.564 153.56-153.56 153.56-85.001 0-153.56-68.565-153.56-153.56 0-85.001 68.564-153.56 153.56-153.56z"
				/>
			</svg>
			<span>${props.children}</span>
		</button>
	`;
};

const ManualInputToken = () => {
	const createTokenLink = GITLAB_DOMAIN + GITLAB_CREATE_TOKEN_URL + '?scopes=read_api&name=GitLab1s';
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
			<${VscodeLink} to="${createTokenLink}" external>Create New AccessToken<//>
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

const AuthenticationForm = (props) => {
	return html`
		<div class="authentication-form">
			<div class="form-title">${props.title || 'Authenticating to GitLab'}</div>
			<${AuthenticationFeatures} />
			<div class="form-content">
				<${AuthenticationButton}>Connect to GitLab<//>
				<${SplitLine} />
				<${ManualInputToken} />
			</div>
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

const AuthenticationDetail = ({ accessToken }) => {
	const ratteLimitDocumentationLink =
		'https://docs.gitlab.com/ee/user/gitlab_com/index.html#gitlabcom-specific-rate-limits';
	const [tokenStatus, setTokenStatus] = useState(null);

	const handleRefreshTokenStatus = useCallback(() => {
		postMessage('validate-token', accessToken).then((tokenStatus) => {
			setTokenStatus(tokenStatus || { invalid: true });
		});
	}, [accessToken]);

	const handleClearToken = useCallback(() => {
		postMessage('call-vscode-message-api', {
			level: 'warning',
			args: ['Would you want to clear the saved GitLab AccessToken?', { modal: true }, 'Confirm'],
		}).then((choose) => choose === 'Confirm' && postMessage('set-token', ''));
	}, []);

	useEffect(() => {
		handleRefreshTokenStatus();
	}, [handleRefreshTokenStatus]);

	if (!tokenStatus) {
		return html`<${VscodeLoading} />`;
	}

	return html`
		<div class="authentication-detail">
			<div class="detail-title">Access Token Info</div>
			<div class="token-status">
				<div class="status-title">
					<span>Rate Limit Info: </span>
					<span class="refresh-button" onClick=${handleRefreshTokenStatus}>↻</span>
				</div>
				<ul class="rate-limit-info">
					${tokenStatus.invalid ? html`<li>Token Status: <span class="error-text">invalid</span></li>` : ''}
					<li>------------------------------</li>
					<li>X-RateLimit-Limit: <${StatusNumberText} count=${tokenStatus.ratelimitLimit} /></li>
					<li>X-RateLimit-Remaining: <${StatusNumberText} count=${tokenStatus.ratelimitRemaining} /></li>
					<li>X-RateLimit-Used: ${tokenStatus.ratelimitUsed}</li>
					<li>X-RateLimit-Reset: ${tokenStatus.ratelimitReset}</li>
					<li>------------------------------</li>
					<li class="rate-limit-description">
						<span>Current rate limit window will reset after </span>
						<span>${Math.max(tokenStatus.ratelimitReset - Math.ceil(Date.now() / 1000), 0)}s</span>
					</li>
					<li>
						<a href=${ratteLimitDocumentationLink} target="_blank">GitLab Rate limiting Documentation</a>
					</li>
				</ul>
			</div>
			<div class="token-operations">
				<${VscodeButton} size="middle" onClick=${handleClearToken}>Clear Access Token<//>
			</div>
		</div>
	`;
};

const App = () => {
	const [loading, setLoading] = useState(true);
	const [accessToken, setAccessToken] = useState('');
	const [notice, setNotice] = useState('');

	useEffect(() => {
		postMessage('get-token').then((token) => {
			setAccessToken(token);
			setLoading(false);
		});
		postMessage('get-notice').then((notice) => setNotice(notice));
	}, []);

	useEffect(() => {
		const handler = ({ data }) => {
			if (data.type === 'token-changed') {
				setAccessToken(data.token);
				postMessage('get-notice').then((notice) => setNotice(notice));
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
			<${AuthenticationFooter} />
		</div>
	`;
};

const loadingElement = document.getElementById('page-loading');
loadingElement.parentNode.removeChild(loadingElement);
render(html`<${App} />`, document.getElementById('app'));
