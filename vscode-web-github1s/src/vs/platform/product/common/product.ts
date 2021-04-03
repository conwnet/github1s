/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileAccess } from 'vs/base/common/network';
import { isWeb } from 'vs/base/common/platform';
import { env } from 'vs/base/common/process';
import { dirname, joinPath } from 'vs/base/common/resources';
import { IProductConfiguration } from 'vs/platform/product/common/productService';

let product: IProductConfiguration;

// Web or Native (sandbox TODO@sandbox need to add all properties of product.json)
if (isWeb || typeof require === 'undefined' || typeof require.__$__nodeRequire !== 'function') {

	// Built time configuration (do NOT modify)
	product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/ } as IProductConfiguration;

	// Running out of sources
	if (Object.keys(product).length === 0) {
		Object.assign(product, {
			version: '1.55.0-dev',
			// below codes are changed by github1s
			nameShort: 'GitHub1s',
			nameLong: 'GitHub1s',
			// below codes are changed by github1s
			applicationName: 'code-oss',
			dataFolderName: '.vscode-oss',
			urlProtocol: 'code-oss',
			reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
			licenseName: 'MIT',
			licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
			extensionAllowedProposedApi: [
				'ms-vscode.vscode-js-profile-flame',
				'ms-vscode.vscode-js-profile-table',
				'ms-vscode.github-browser',
				'ms-vscode.remotehub',
				'ms-vscode.remotehub-insiders'
			],
			// below codes are changed by github1s
			extensionsGallery: {
				serviceUrl: 'https://marketplace.visualstudio.com/_apis/public/gallery',
				cacheUrl: 'https://vscode.blob.core.windows.net/gallery/index',
				itemUrl: 'https://marketplace.visualstudio.com/items',
				controlUrl: 'https://az764295.vo.msecnd.net/extensions/marketplace.json',
				recommendationsUrl: 'https://az764295.vo.msecnd.net/extensions/workspaceRecommendations.json.gz',
			}
			// below codes are changed by github1s
		});
	}
}

// Native (non-sandboxed)
else {

	// Obtain values from product.json and package.json
	const rootPath = dirname(FileAccess.asFileUri('', require));

	product = require.__$__nodeRequire(joinPath(rootPath, 'product.json').fsPath);
	const pkg = require.__$__nodeRequire(joinPath(rootPath, 'package.json').fsPath) as { version: string; };

	// Running out of sources
	if (env['VSCODE_DEV']) {
		Object.assign(product, {
			nameShort: `${product.nameShort} Dev`,
			nameLong: `${product.nameLong} Dev`,
			dataFolderName: `${product.dataFolderName}-dev`
		});
	}

	Object.assign(product, {
		version: pkg.version
	});
}

export default product;
