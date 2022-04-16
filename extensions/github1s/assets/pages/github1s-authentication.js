import { render } from 'https://unpkg.com/preact@latest?module';
import { useState, useCallback, useEffect } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import { html, VscodeButton, VscodeInput, VscodeLoading, VscodeLink, postMessage } from './components.js';

const AuthenticationFeatures = () => {
	return html`
		<ul class="authentication-features">
			<li class="feature-item">
				<a
					class="link"
					href="https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-access-to-your-personal-repositories"
					target="_blank"
					>Access GitHub personal repository</a
				>
			</li>
			<li class="feature-item">
				<a
					class="link"
					href="https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting"
					target="_blank"
					>Higher rate rimit for GitHub official API</a
				>
			</li>
			<li class="feature-item">
				<a
					class="link"
					href="https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql"
					target="_blank"
					>Support for GitHub GraphQL API</a
				>
			</li>
		</ul>
	`;
};

const AuthenticationButton = (props) => {
	const [authenticating, setAuthenticating] = useState(false);

	const handleButtonClick = useCallback(() => {
		setAuthenticating(true);
		postMessage('connect-to-github').then(() => setAuthenticating(false));
	}, []);

	return html`
		<button class="authentication-button" disabled="${authenticating}" onClick=${handleButtonClick} ...${props}>
			<svg class="github-logo" height="32" viewBox="0 0 16 16" version="1.1" width="32" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
				></path>
			</svg>
			<span>${props.children}</span>
		</button>
	`;
};

const ManualInputToken = () => {
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
			<div class="form-title">${props.title || 'Authenticating to GitHub'}</div>
			<${AuthenticationFeatures} />
			<div class="form-content">
				<${AuthenticationButton}>Connect to GitHub<//>
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
	const ratteLimitDocumentationLink = 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting';
	const [tokenStatus, setTokenStatus] = useState(null);

	const handleRefreshTokenStatus = useCallback(() => {
		postMessage('validate-token', accessToken).then((tokenStatus) => {
			setTokenStatus(tokenStatus);
		});
	}, [accessToken]);

	const handleClearToken = useCallback(() => {
		postMessage('call-vscode-message-api', {
			level: 'warning',
			args: ['Would you want to clear the saved GitHub AccessToken?', { modal: true }, 'Confirm'],
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
						<a href=${ratteLimitDocumentationLink} target="_blank">GitHub Rate limiting Documentation</a>
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
