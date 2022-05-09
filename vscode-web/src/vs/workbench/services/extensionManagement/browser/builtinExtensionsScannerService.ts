/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IBuiltinExtensionsScannerService, ExtensionType, IExtensionManifest, IExtension, TargetPlatform } from 'vs/platform/extensions/common/extensions';
import { isWeb } from 'vs/base/common/platform';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IUriIdentityService } from 'vs/platform/uriIdentity/common/uriIdentity';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { getGalleryExtensionId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { FileAccess } from 'vs/base/common/network';
import { localizeManifest } from 'vs/platform/extensionManagement/common/extensionNls';

interface IBundledExtension {
	extensionPath: string;
	packageJSON: IExtensionManifest;
	packageNLS?: any;
	readmePath?: string;
	changelogPath?: string;
}

export class BuiltinExtensionsScannerService implements IBuiltinExtensionsScannerService {

	declare readonly _serviceBrand: undefined;

	private readonly builtinExtensions: IExtension[] = [];

	constructor(
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
	) {
		if (isWeb) {
			const builtinExtensionsServiceUrl = FileAccess.asBrowserUri('../../../../../../extensions', require);
			if (builtinExtensionsServiceUrl) {
				let bundledExtensions: IBundledExtension[] = [];

				if (environmentService.isBuilt) {
					// Built time configuration (do NOT modify)
					bundledExtensions = [/*BUILD->INSERT_BUILTIN_EXTENSIONS*/];
				} else {
					// Find builtin extensions by checking for DOM
					const builtinExtensionsElement = document.getElementById('vscode-workbench-builtin-extensions');
					const builtinExtensionsElementAttribute = builtinExtensionsElement ? builtinExtensionsElement.getAttribute('data-settings') : undefined;
					if (builtinExtensionsElementAttribute) {
						try {
							bundledExtensions = JSON.parse(builtinExtensionsElementAttribute);
						} catch (error) { /* ignore error*/ }
					}
				}

	      // below codes are changed by github1s
				if (Array.isArray((window as any)?.vscodeWeb?.builtinExtensions)) {
					bundledExtensions.push(...(window as any)?.vscodeWeb?.builtinExtensions);
				} else if (typeof (window as any)?.vscodeWeb?.builtinExtensions === 'function') {
					bundledExtensions = (window as any)?.vscodeWeb?.builtinExtensions(bundledExtensions);
				}
	      // above codes are changed by github1s

				this.builtinExtensions = bundledExtensions.map(e => ({
					identifier: { id: getGalleryExtensionId(e.packageJSON.publisher, e.packageJSON.name) },
					location: uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl!, e.extensionPath),
					type: ExtensionType.System,
					isBuiltin: true,
					manifest: e.packageNLS ? localizeManifest(e.packageJSON, e.packageNLS) : e.packageJSON,
					readmeUrl: e.readmePath ? uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl!, e.readmePath) : undefined,
					changelogUrl: e.changelogPath ? uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl!, e.changelogPath) : undefined,
					targetPlatform: TargetPlatform.WEB,
				}));
			}
		}
	}

	async scanBuiltinExtensions(): Promise<IExtension[]> {
		return [...this.builtinExtensions];
	}
}

registerSingleton(IBuiltinExtensionsScannerService, BuiltinExtensionsScannerService);
