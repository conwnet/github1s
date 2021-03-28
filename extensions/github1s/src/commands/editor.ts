/**
 * @file Editor Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import * as queryString from 'query-string';
import router from '@/router';
import { basename } from '@/helpers/util';

const openFileToEditor = async (fileUri) => {
	const isCurrentAuthority =
		fileUri.authority === (await router.getAuthority());

	// In order to make the file explorer focus corresponding file when
	// the `fileUri.authority` equals `current authority`, set the
	// `fileUri.authority` to '' in this case
	const targetFileUri = isCurrentAuthority
		? fileUri.with({ authority: '' })
		: fileUri;

	let editorLabel = undefined;
	if (!isCurrentAuthority) {
		// the authority here should be `{owner}+{repo}+{commitSha}`
		const [_owner, _repo, commitSha] = targetFileUri.authority.split('+');
		editorLabel = `${basename(targetFileUri.path)} (${commitSha.slice(0, 7)})`;
	}

	return vscode.commands.executeCommand(
		'vscode.open',
		targetFileUri,
		{ preview: false },
		editorLabel
	);
};

// open the left file in the diff editor title
export const commandDiffViewOpenLeftFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	if (!query.base) {
		return;
	}
	return openFileToEditor(vscode.Uri.parse(query.base as string));
};

// open the right file in the diff editor title
export const commandDiffViewOpenRightFile = async (fileUri: vscode.Uri) => {
	const query = queryString.parse(fileUri?.query || '');
	if (!query.head) {
		return;
	}
	return openFileToEditor(vscode.Uri.parse(query.head as string));
};
