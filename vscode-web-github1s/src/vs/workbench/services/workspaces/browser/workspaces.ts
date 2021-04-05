/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISingleFolderWorkspaceIdentifier, IWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { URI } from 'vs/base/common/uri';
import { hash } from 'vs/base/common/hash';

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

export function getWorkspaceIdentifier(workspacePath: URI): IWorkspaceIdentifier {
	return {
		id: getWorkspaceId(workspacePath),
		configPath: workspacePath
	};
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

export function getSingleFolderWorkspaceIdentifier(folderPath: URI): ISingleFolderWorkspaceIdentifier {
	// below codes are changed by github1s
	if (!folderPath.authority) {
		// Use string `owner+repo:path` to generate id
		// In this way, the workspaceState will be isolated between from different repo
		const [owner = 'conwnet', repo = 'github1s'] = URI.parse(window.location.href).path.split('/').filter(Boolean);
		const id = hash(`${owner}+${repo}:${folderPath.toString()}`).toString(16);
		return { id, uri: folderPath };
	}
	// above codes are changed by github1s

	return {
		id: getWorkspaceId(folderPath),
		uri: folderPath
	};
}

function getWorkspaceId(uri: URI): string {
	return hash(uri.toString()).toString(16);
}
