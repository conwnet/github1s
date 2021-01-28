/**
 * @file extension entry
 * @author netcon
 */

import * as vscode from 'vscode';
import { Github1sFS } from './githubfs';
import { prop } from './util';
import { RepoState } from './types';

export function activate(context: vscode.ExtensionContext) {
  const authority = prop(vscode.workspace, ['workspaceFolders', 0, 'uri', 'authority']) as string || '';
  const [owner, repo, branch] = authority.split('/');
  const repoState: RepoState = { owner, repo, branch };
  context.subscriptions.push(new Github1sFS(repoState));
};
