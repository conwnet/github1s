/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileAccess } from 'vs/base/common/network';
import { globals } from 'vs/base/common/platform';
import { env } from 'vs/base/common/process';
import { IProductConfiguration } from 'vs/base/common/product';
import { dirname, joinPath } from 'vs/base/common/resources';
import { ISandboxConfiguration } from 'vs/base/parts/sandbox/common/sandboxTypes';

let product: IProductConfiguration;

// Native sandbox environment
if (typeof globals.vscode !== 'undefined' && typeof globals.vscode.context !== 'undefined') {
	const configuration: ISandboxConfiguration | undefined = globals.vscode.context.configuration();
	if (configuration) {
		product = configuration.product;
	} else {
		throw new Error('Sandbox: unable to resolve product configuration from preload script.');
	}
}

// Native node.js environment
else if (typeof require?.__$__nodeRequire === 'function') {

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

// Web environment or unknown
else {

	// Built time configuration (do NOT modify)
	product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/ } as IProductConfiguration;

	// Running out of sources
	if (Object.keys(product).length === 0) {
		Object.assign(product, {
			version: '1.60.0-dev',
			nameShort: 'Code - OSS Dev',
			nameLong: 'Code - OSS Dev',
			applicationName: 'code-oss',
			dataFolderName: '.vscode-oss',
			urlProtocol: 'code-oss',
			reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
			licenseName: 'MIT',
			licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
			extensionAllowedProposedApi: [
				'ms-vscode.vscode-js-profile-flame',
				'ms-vscode.vscode-js-profile-table',
				'ms-vscode.remotehub',
				'ms-vscode.remotehub-insiders',
				'GitHub.remotehub',
				'GitHub.remotehub-insiders'
			],
		});
	}

	// below codes are changed by github1s
	const productConfElement = document.getElementById('vscode-product-configuration');
	const productConfAttribute = productConfElement ? productConfElement.getAttribute('data-settings') : undefined;
	if (productConfAttribute) {
		try {
			const productConfiguration = JSON.parse(productConfAttribute);
			product = Object.assign(product, productConfiguration);
		} catch (e) { /* invalid productConfig, ignore it  */ }
	}
	// above codes are changed by github1s
}

export default product;
