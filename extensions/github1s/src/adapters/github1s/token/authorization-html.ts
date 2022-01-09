/**
 * @file github authorization page
 * @author netcon
 */

import { getNonce } from '@/helpers/util';

export const getAuthorizationHtml = () => {
	const nonce = getNonce();

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
	<title>Authorizing to GitHub</title>
	<style nonce="${nonce}">
body {
	color: #fff;
	color: var(--vscode-editor-foreground);
	background-color: #1e1e1e;
	background-color: var(--vscode-editor-background);
	font-family: var(--vscode-font-family);
}

.page-container {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.page-container .title {
	margin: 0 0 20px 0;
}

.page-container .description {
	text-align: center;
	line-height: 1.5;
	margin-bottom: 32px;
}

.page-container .authorizing-methods {
	width: 360px;
	margin-bottom: 12px;
}

.page-container .link {
	color: #3794ff;
	color: var(--vscode-textLink-foreground);
	transition: all .1s;
}

.page-container .link:hover {
	opacity: .8;
}

.page-container .link:active {
	opacity: .6;
}

.page-container .authorizing-button {
	background-color: #fff;
	background-color: var(--vscode-extensionButton-prominentForeground);
	height: 40px;
	width: 100%;
	outline: none;
	margin: 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #fff;
	box-shadow: rgba(255, 255, 255, 0.2) 0px 2px 4px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 16px;
	transition: all 0.1s;
	cursor: pointer;
}

.page-container .authorizing-button:not([disabled]):hover {
	transform: scale(1.03);
	box-shadow: rgba(255, 255, 255, 0.25) 0px 2px 8px;
}

.page-container .authorizing-button:not([disabled]):active {
	transform: scale(0.98);
}

.page-container .authorizing-button .github-logo {
	height: 24px;
	margin-right: 8px;
}

.page-container .authorizing-methods .split-line {
	height: 0;
	border: 1px solid #ccc;
	margin: 28px 0;
	position: relative;
}

.page-container .authorizing-methods .split-line::after {
	content: 'OR';
	display: block;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translateY(-50%) translateX(-50%);
	border: 2px solid #ccc;
	padding: 4px 16px;
	border-radius: 8px;
	background-color: #000;
	font-size: 12px;
	font-weight: bold;
}

.page-container .input-token-form {
	display: flex;
	height: 32px;
	margin-bottom: 8px;
}

.page-container .input-box {
	margin-right: 8px;
	display: block;
	width: 100%;
	height: 100%;
	border: none;
	border-radius: 4px;
	margin-bottom: 10px;
	padding-left: 4px;
	padding-right: 4px;
	color: #ccc;
	color: var(--vscode-input-foreground);
	outline-color: var(--vscode-input-border);
	background-color: #3c3c3c;
	background-color: var(--vscode-input-background);
	padding-left: 8px;
	padding-right: 8px;
	font-weight: 14px;
}

.page-container .input-box:focus {
	outline: 1px solid -webkit-focus-ring-color;
	outline-offset: -1px;
}

.page-container .submit-button {
	border: none;
	width: 60px;
	height: 100%;
	line-height: 32px;
	border-radius: 4px;
	text-align: center;
	outline: 1px solid transparent;
	outline-offset: 2px !important;
	color: #fff;
	color: var(--vscode-button-foreground);
	background-color: #0e639c;
	background-color: var(--vscode-button-background);
	transition: all .1s;
	cursor: pointer;
}

.page-container .submit-button:not([disabled]):hover {
	opacity: .8;
}

.page-container .submit-button:not([disabled]):active {
	opacity: .6;
}

.page-container .create-token-link {
	font-size: 14px;
}

.page-container .tip {
	width: 360px;
	font-size: 13px;
	line-height: 18px;
}

	</style>
</head>
<body>
<div class="page-container">
	<h1 class="title">Authorizing to GitHub</h1>
	<div class="description">
		<div>GitHub API rate limit exceeded for your IP.</div>
		<div>Authenticated requests get a higher rate limit.</div>
		<div>
			<span>Read more about this on </span>
			<a class="link" href="https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting" target="blank">
				GitHub Documentation
			</a>
		</div>
	</div>

	<div class="authorizing-methods">
		<button class="authorizing-button">
			<svg class="github-logo" height="32" viewBox="0 0 16 16" version="1.1" width="32" aria-hidden="true">
				<path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z">
				</path>
			</svg>
			<div>Connect to GitHub</div>
		</button>
		<div class="split-line"></div>
		<form class="input-token-form">
			<input class="input-box" placeholder="Input OAuth Token" />
			<button type="submit" class="submit-button">Submit</button>
		</form>
		<div class="create-token-link">
			<a class="link create-token-link" href="https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s" target="_blank">
				Create New OAuth Token
			</a>
		</div>
	</div>

	<div class="tip">
		<div>The authorization data will save in your browser.</div>
		<div>Don't forget clean it if you are using a public device.</div>
	</div>
</div>
</body>
</html>
`;
};
