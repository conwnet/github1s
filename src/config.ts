/**
 * @file config for different platform
 * @author netcon
 */

import githubLogoUrl from './assets/github.svg';
import gitlabLogoUrl from './assets/gitlab.svg';
import bitbucketLogoUrl from './assets/bitbucket.svg';
import npmLogoUrl from './assets/npm.svg';

const createFolderWorkspace = (scheme: string) => ({
	folderUri: { scheme, authority: '', path: '/', query: '', fragment: '' },
});

const openGitHub1sPage = () => {
	return window.open('https://github.com/conwnet/github1s', '_blank');
};

const openOfficialPage = (origin: string) => {
	const targetPath = window.location.pathname + window.location.search + window.location.hash;
	return window.open(origin + targetPath, '_blank');
};

const createWindowIndicator = (label: string) => ({
	tooltip: label || '',
	label: label || '$(remote)',
	command: 'github1s.commands.openRepository',
});

const createConfigurationDefaults = (disableSomeAnyCodeFeatures: boolean) => {
	const configurationDefaults = {
		'workbench.colorTheme': 'Default Dark+',
		'telemetry.telemetryLevel': 'off',
		'workbench.startupEditor': 'readme',
		'workbench.editorAssociations': { '*.md': 'vscode.markdown.preview.editor' },
		'markdown.preview.doubleClickToSwitchToEditor': false,
	} as Record<string, any>;

	// disable some anycode features when we can use sourcegraph instead
	if (disableSomeAnyCodeFeatures) {
		configurationDefaults['anycode.language.features'] = {
			completions: false,
			definitions: false,
			references: false,
			highlights: true,
			outline: true,
			workspaceSymbols: true,
			folding: false,
			diagnostics: false,
		};
	}
	return configurationDefaults;
};

export enum Platform {
	GitHub = 'GitHub',
	GitLab = 'GitLab',
	Bitbucket = 'Bitbucket',
	npm = 'npm',
}

export const createVSCodeWebConfig = (platform: Platform, repository: string): any => {
	if (platform === Platform.GitLab) {
		return {
			hideTextFileLabelDecorations: !!repository,
			windowIndicator: createWindowIndicator(repository),
			configurationDefaults: createConfigurationDefaults(!!repository),
			workspace: repository ? createFolderWorkspace('gitlab1s') : undefined,
			workspaceId: repository ? 'gitlab1s:' + repository : '',
			workspaceLabel: repository,
			logo: {
				title: 'Open on GitLab',
				icon: gitlabLogoUrl,
				onClick: () => (repository ? openOfficialPage('https://gitlab.com') : openGitHub1sPage()),
			},
		};
	}

	// bitbucket is not available now
	if (platform === Platform.Bitbucket) {
		return {
			hideTextFileLabelDecorations: !!repository,
			windowIndicator: createWindowIndicator(repository),
			configurationDefaults: createConfigurationDefaults(!!repository),
			workspace: repository ? createFolderWorkspace('bitbucket1s') : undefined,
			workspaceId: repository ? 'bitbucket1s:' + repository : '',
			workspaceLabel: repository,
			logo: {
				title: 'Open on Bitbucket',
				icon: bitbucketLogoUrl,
				onClick: () => (repository ? openOfficialPage('https://bitbucket.org') : openGitHub1sPage()),
			},
		};
	}

	if (platform === Platform.npm) {
		return {
			hideTextFileLabelDecorations: !!repository,
			windowIndicator: createWindowIndicator(repository),
			configurationDefaults: createConfigurationDefaults(false),
			workspace: repository ? createFolderWorkspace('npmjs1s') : undefined,
			workspaceId: repository ? 'npmjs1s:' + repository : '',
			workspaceLabel: repository,
			logo: {
				title: 'Open on npm',
				icon: npmLogoUrl,
				onClick: () => (repository ? openOfficialPage('https://npmjs.com') : openGitHub1sPage()),
			},
		};
	}

	const isOnlineEditor = repository === 'editor';
	return {
		hideTextFileLabelDecorations: !isOnlineEditor,
		windowIndicator: createWindowIndicator(repository),
		configurationDefaults: createConfigurationDefaults(!!repository),
		workspace: !isOnlineEditor ? createFolderWorkspace(repository ? 'github1s' : 'ossinsight') : undefined,
		workspaceId: !isOnlineEditor ? 'github1s:' + (repository || 'trending') : '',
		workspaceLabel: repository || (isOnlineEditor ? '' : 'GitHub Trending'),
		logo: {
			title: 'Open on GitHub',
			icon: githubLogoUrl,
			onClick: () => (repository ? openOfficialPage('https://github.com') : openGitHub1sPage()),
		},
	};
};
