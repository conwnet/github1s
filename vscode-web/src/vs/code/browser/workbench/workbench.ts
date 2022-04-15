/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { create, IProductConfiguration, IWorkbenchConstructionOptions, IWorkspaceProvider, UriComponents } from 'vs/workbench/workbench.web.main';
import { IExtensionManifest } from 'vs/platform/extensions/common/extensions';
import { env } from 'vs/workbench/browser/web.factory';
import { URI } from 'vs/base/common/uri';

// same as vscode-web/src/vs/workbench/services/extensionManagement/browser/builtinExtensionsScannerService.ts
interface IBundledExtension {
	extensionPath: string;
	packageJSON: IExtensionManifest;
	packageNLS?: any;
	readmePath?: string;
	changelogPath?: string;
}

declare global {
	interface Window {
		vscodeWeb?: Partial<IWorkbenchConstructionOptions> & {
			folderUri?: UriComponents, // easy way to build single folder workspace
			workspaceLabel?: string; // the workspace label shown on explorer
			hideTextFileReadonlyIcon?: boolean; // if hide the readonly icon for readonly files
			// custom builtin extensions
			builtinExtensions?: IBundledExtension[] | ((builtinExtensions: IBundledExtension[]) => IBundledExtension[]);
			// custom product.json
			product?: IProductConfiguration | ((product: IProductConfiguration) => IProductConfiguration);
			logo?: { // custom editor logo, hide logo if this is undefined
				icon?: string; // logo icon image url
				title?: string; // logo title
				onClick?: () => void; // logo click callback
			},
			// descripbe how to open other workspace,
			// only worked when folderUri is defined
			openWorkspace?: IWorkspaceProvider['open'],
			onWorkbenchReady?: (scheme: string) => void; // workbench ready callback
		};
	}
}

(function () {
	const workspaceProvider: IWorkspaceProvider | undefined = window?.vscodeWeb?.folderUri ? {
		trusted: true,
		workspace: { folderUri: URI.from(window.vscodeWeb.folderUri) },
		open: window.vscodeWeb?.openWorkspace || (() => Promise.resolve(false)),
	} : undefined;

	// Create workbench
	create(document.body, { workspaceProvider, ...window.vscodeWeb });
	env.getUriScheme().then(scheme => window.vscodeWeb?.onWorkbenchReady?.(scheme))
})();
