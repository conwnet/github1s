/* eslint-disable header/header */
/**
 * @file custom welcome page
 * @author netcon
 */

import 'vs/css!./welcomePage';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IProductService } from 'vs/platform/product/common/productService';
import { escape } from 'vs/base/common/strings';
import { localize } from 'vs/nls';
import * as marked from 'vs/base/common/marked/marked';
const configurationKey = 'workbench.startupEditor';

const buildTemplate = () => `
<div class="welcomePageContainer">
	<div class="welcomePage" role="document">
		<div class="title">
			<h1 class="caption">${escape(localize('welcomePage.vscode', "Visual Studio Code"))}</h1>
			<p class="subtitle detail">
				One second to read GitHub code with VS Code
			</p>
		</div>
		<div class="row">
			<div class="splash">
				<div class="section rate-limit-info">
					<h2 class="caption">Rate limit Info: <span class="refresh-button codicon codicon-refresh"></span></h2>
					<ul class="rate-limit-info>
						<li>Status: <span class="rate-limit-status"></span></li>
						<li>------------------------------</li>
						<li>X-RateLimit-Limit: <span class="x-rate-limit-limit"></span></li>
						<li>X-RateLimit-Remaining: <span class="x-rate-limit-remaining"></span></li>
						<li>X-RateLimit-Reset: <span class="x-rate-limit-reset"></span></li>
						<li>------------------------------</li>
						<li class="rate-limit-description">Current rate limit window will reset after <span class="rate-limit-reset-seconds"></span>s</li>
						<li><a href="https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting" target="_blank">GitHub Rate limiting Documentation</a></li>
					</ul>
				</div>
				<div class="section help">
					<h2 class="caption">${escape(localize('welcomePage.help', "Help"))}</h2>
					<ul>
						<li><a href="https://github.com/conwnet/github1s" target="_blank">GitHub1s Repository</a></li>
						<li><a href="https://github.com/microsoft/vscode" target="_blank">VS Code Repository</a></li>
						<li><a href="https://docs.github.com/en/rest" target="_blank">GitHub REST API Documentation</a></li>
						<li><a href="https://code.visualstudio.com/docs" target="_blank">VS Code Documentation</a></li>
						<li><a href="https://github.com/conwnet/github1s/issues" target="_blank">Advices and Issues</a></li>
					</ul>
				</div>
				<p class="showOnStartup"><input type="checkbox" id="showOnStartup" class="checkbox"/> <label class="caption" for="showOnStartup">${escape(localize('welcomePage.showOnStartup', "Show welcome page on startup"))}</label></p>
			</div>
			<div class="commands">
				<div class="section authentication">
				<h2 class="caption">Authentication</h2>
				<div class="list">
					<div class="item"><button class="update-oauth-token"><h3 class="caption">Update OAuth Token</h3><span class="detail">Use a <a href="https://docs.github.com/en/rest/overview/resources-in-the-rest-api#oauth2-token-sent-in-a-header" target="_blank">GitHub OAuth token</a> to increase your rate limit</span></button></div>
					<div class="item"><button class="create-new-token"><h3 class="caption">Create New Token</h3><span class="detail">Create a new Token from your GitHub account</span></button></div>
					<div class="item"><button class="clear-oauth-token"><h3 class="caption">Clear Saved Token</h3><span class="detail">Clear the saved GitHub OAuth token for security</span></button></div>
				</div>
				</div>
				<div class="section learn">
					<h2 class="caption">${escape(localize('welcomePage.learn', "Learn"))}</h2>
					<div class="list">
						<div class="item showCommands"><button class="show-all-commands"><h3 class="caption">${escape(localize('welcomePage.showCommands', "Find and run all commands"))}</h3> <span class="detail">${escape(localize('welcomePage.showCommandsDescription', "Rapidly access and search commands from the Command Palette ({0})")).replace('{0}', '<span class="shortcut" data-command="workbench.action.showCommands"></span>')}</span></button></div>
						<div class="item showInterfaceOverview"><button class="show-interface-overview"><h3 class="caption">${escape(localize('welcomePage.interfaceOverview', "Interface overview"))}</h3> <span class="detail">${escape(localize('welcomePage.interfaceOverviewDescription', "Get a visual overlay highlighting the major components of the UI"))}</span></button></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
`;

export class GitHub1sWelcomePage {
	private container?: HTMLElement;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IProductService private readonly productService: IProductService,
		@ICommandService private readonly commandService: ICommandService,
	) { }

	public render() {
		if (this.container) {
			return this.container;
		}
		const content = marked(buildTemplate());
		this.container = document.createElement('div');
		this.container.classList.add('github1sWelcomePage');
		this.container.innerHTML = content;
		this.onReady(this.container);

		return this.container;
	}

	onReady(container: HTMLElement) {
		const enabled = this.configurationService.getValue(configurationKey) === 'welcomePage';
		const showOnStartup = <HTMLInputElement>container.querySelector('#showOnStartup');
		if (enabled) {
			showOnStartup.setAttribute('checked', 'checked');
		}
		showOnStartup.addEventListener('click', e => {
			this.configurationService.updateValue(configurationKey, showOnStartup.checked ? 'welcomePage' : 'newUntitledFile');
		});

		const prodName = container.querySelector('.welcomePage .title .caption') as HTMLElement;
		if (prodName) {
			prodName.textContent = this.productService.nameLong;
		}

		const gitHubTokenStatus = this.getGitHubTokenStatus();
		gitHubTokenStatus.then(tokenStatus => this.doUpdateGitHubTokenStatus(container, tokenStatus));
		this.registerGitHub1sListeners(container);
	}

	registerGitHub1sListeners(container: HTMLElement) {
		container.querySelector('.refresh-button')?.addEventListener('click', () => this.refreshGitHubTokenStatus(container));
		container.querySelector('.create-new-token')?.addEventListener('click', () => window?.open('https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s'));
		container.querySelector('.update-oauth-token')?.addEventListener('click', () => this.commandService.executeCommand('github1s.authorizing-github-with-overlay').then(() => this.refreshGitHubTokenStatus(container)));
		container.querySelector('.clear-oauth-token')?.addEventListener('click', () => this.commandService.executeCommand('github1s.clear-token').then(() => this.refreshGitHubTokenStatus(container)));
		container.querySelector('.show-all-commands')?.addEventListener('click', () => this.commandService.executeCommand('workbench.action.showCommands'));
		container.querySelector('.show-interface-overview')?.addEventListener('click', () => this.commandService.executeCommand('workbench.action.showInterfaceOverview'));
	}

	updateElementText(element: HTMLElement, text: string | number, type?: 'SUCCESS' | 'WARNING' | 'ERROR') {
		if (!element) {
			return;
		}
		element.innerText = `${text}`;
		element.classList.remove('text-warning', 'text-error', 'text-success');
		if (type === 'SUCCESS') {
			element.classList.add('text-success');
		} else if (type === 'WARNING') {
			element.classList.add('text-warning');
		} else if (type === 'ERROR') {
			element.classList.add('text-error');
		}
	}


	getGitHubTokenStatus() {
		return this.commandService.executeCommand('github1s.validate-token', '', true);
	}

	refreshGitHubTokenStatus(container: HTMLElement) {
		const statusElement = <HTMLDivElement>container.querySelector('.rate-limit-status');
		this.updateElementText(statusElement, '');
		this.getGitHubTokenStatus().then(tokenStatus => {
			this.doUpdateGitHubTokenStatus(container, tokenStatus);
		});
	}

	doUpdateGitHubTokenStatus(container: HTMLElement, tokenStatus?: any) {
		const statusElement = <HTMLDivElement>container.querySelector('.rate-limit-status');
		const limitElement = <HTMLDivElement>container.querySelector('.x-rate-limit-limit');
		const remainingElement = <HTMLDivElement>container.querySelector('.x-rate-limit-remaining');
		const resetElement = <HTMLDivElement>container.querySelector('.x-rate-limit-reset');
		const timerElement = <HTMLDivElement>container.querySelector('.rate-limit-reset-seconds');

		if (!tokenStatus) {
			this.updateElementText(statusElement, 'Unknown', 'WARNING');
			this.updateElementText(limitElement, 'Unknown', 'WARNING');
			this.updateElementText(remainingElement, 'Unknown', 'WARNING');
			this.updateElementText(resetElement, 'Unknown');
			this.updateElementText(timerElement, 'Unknown', 'WARNING');
			return;
		}

		const textType = (value: number) => {
			if (value <= 0) {
				return 'ERROR';
			}
			if (value > 99) {
				return 'SUCCESS';
			}
			return 'WARNING';
		};
		this.updateElementText(limitElement, tokenStatus.limit, textType(+tokenStatus.limit));
		this.updateElementText(remainingElement, tokenStatus.remaining, textType(+tokenStatus.remaining));
		this.updateElementText(resetElement, tokenStatus.reset);
		this.updateElementText(timerElement, Math.max(tokenStatus.reset - Math.ceil(Date.now() / 1000), 0));

		if (!tokenStatus.token) {
			this.updateElementText(statusElement, 'Unauthorized', 'WARNING');
			return;
		}
		if (tokenStatus.valid) {
			this.updateElementText(statusElement, 'Authorized', 'SUCCESS');
			return;
		}
		this.updateElementText(statusElement, 'Invalid Token', 'ERROR');
	}
};
