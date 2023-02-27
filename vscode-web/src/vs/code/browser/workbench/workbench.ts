/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { create } from 'vs/workbench/workbench.web.main';
import { IExtensionManifest } from 'vs/platform/extensions/common/extensions';
import { IWorkbenchConstructionOptions } from 'vs/workbench/browser/web.api';
import { IWorkspaceProvider } from 'vs/workbench/services/host/browser/browserHostService';
import { URI, UriComponents } from 'vs/base/common/uri';
import { env } from 'vs/workbench/browser/web.factory';

// same as vscode-web/src/vs/workbench/services/extensionManagement/browser/builtinExtensionsScannerService.ts
interface IBundledExtension {
	extensionPath: string;
	packageJSON: IExtensionManifest;
	packageNLS?: any;
	browserNlsMetadataPath?: string;
	readmePath?: string;
	changelogPath?: string;
}

declare global {
	interface Window {
		vscodeWeb?: Partial<IWorkbenchConstructionOptions> & {
			workspace?: { folderUri?: UriComponents; workspaceUri?: UriComponents; };
			workspaceId?: string; // the identifier to distinguish workspace
			workspaceLabel?: string; // the label shown on explorer
			hideTextFileLabelDecorations?: boolean; // whether hide the readonly icon for readonly files
			allowEditorLabelOverride?: boolean; // whether allow override editor label
			// custom builtin extensions
			builtinExtensions?: IBundledExtension[] | ((builtinExtensions: IBundledExtension[]) => IBundledExtension[]);
			logo?: { // custom editor logo, hide logo if this is undefined
				icon?: string; // logo icon image url
				title?: string; // logo title
				onClick?: () => void; // logo click callback
			};
			// descripbe how to open other workspace,
			// only worked when folderUri is defined
			openWorkspace?: IWorkspaceProvider['open'];
			onWorkbenchReady?: (scheme: string) => void; // workbench ready callback
		};
	}
}

(function () {
	const resolveWorkspace = (workspace?: { folderUri?: UriComponents; workspaceUri?: UriComponents; }) => {
		if (workspace?.folderUri) {
			return { folderUri: URI.from(workspace.folderUri) };
		}
		if (workspace?.workspaceUri) {
			return { workspaceUri: URI.from(workspace.workspaceUri) };
		}
		return { workspaceUri: URI.from({ scheme: 'tmp', path: '/default.code-workspace' }) };
	};

	const workspaceProvider: IWorkspaceProvider | undefined = {
		trusted: true,
		workspace: resolveWorkspace(window?.vscodeWeb?.workspace),
		open: window?.vscodeWeb?.openWorkspace || (() => Promise.resolve(false)),
	};

	// Create workbench
	create(document.body, { workspaceProvider, ...window?.vscodeWeb });
	env.getUriScheme().then(scheme => window?.vscodeWeb?.onWorkbenchReady?.(scheme));
})();
