import { render } from 'https://unpkg.com/preact@latest?module';
import { useState, useCallback, useEffect } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import { html, VscodeButton, VscodeInput, VscodeLoading, VscodeLink } from './components.js';

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
	return html`
		<button class="authentication-button" disabled="${props.loading}" ...${props}>
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

const AuthenticationToken = () => {
	const createTokenLink = 'https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s';

	return html`
		<div class="authentication-token">
			<div class="token-input-line">
				<${VscodeInput} />
				<${VscodeButton}>Submit<//>
			</div>
			<${VscodeLink} to="${createTokenLink}" external>Create New OAuth Token<//>
		</div>
	`;
};

const SplitLine = () => {
	return html`<div class="split-line"></div>`;
};

const AuthenticationForm = (props) => {
	const [authenticating, setAuthenticating] = useState(false);

	return html`
		<div class="authentication-form">
			<div class="form-title">${props.title || 'Authenticating to GitHub'}</div>
			<${AuthenticationFeatures} />
			<div class="form-content">
				<${AuthenticationButton} disabled=${authenticating}>Connect to GitHub<//>
				<${SplitLine} />
				<${AuthenticationToken} />
				<${AuthenticationNotice} />
			</div>
		</div>
	`;
};

const AuthenticationNotice = () => {
	return html`
		<div class="authentication-notice">
			<div>The access token will only store in your browser.</div>
			<div>Don't forget to clean it while you are using a device that doesn't belong to you.</div>
		</div>
	`;
};

const AuthenticationDetail = () => {
	return html`<div></div>`;
};

const App = () => {
	const [loading, setLoading] = useState(true);
	const [accessToken, setAccessToken] = useState('');

	useEffect(() => {
		setTimeout(() => setLoading(false));
	}, []);

	if (loading) {
		return html`<${VscodeLoading} />`;
	}

	if (accessToken) {
		return html`<${AuthenticationDetail} accessToken=${accessToken} />`;
	}

	return html`<${AuthenticationForm} />`;
};

const loadingElement = document.getElementById('page-loading');
loadingElement.parentNode.removeChild(loadingElement);
render(html`<${App} />`, document.getElementById('app'));
