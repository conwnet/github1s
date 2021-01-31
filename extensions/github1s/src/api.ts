/**
 * @file GitHub1s APIs
 * @author netcon
 */

import * as vscode from 'vscode';
import { fetch } from './util';

interface UriState {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};

const parseUri = (uri: vscode.Uri): UriState => {
  const [owner, repo, branch] = (uri.authority || '').split('+').filter(Boolean);
  return {
    owner,
    repo,
    branch,
    path: uri.path,
  };
};

export const readGitHubDirectory = (uri: vscode.Uri) => {
  const state: UriState = parseUri(uri);
  return fetch(`https://api.github.com/repos/${state.owner}/${state.repo}/git/trees/${state.branch}${state.path.replace(/^\//, ':')}`);
};

export const readGitHubFile = (uri: vscode.Uri, fileSha: string) => {
  const state: UriState = parseUri(uri);
  return fetch(`https://api.github.com/repos/${state.owner}/${state.repo}/git/blobs/${fileSha}`);
};

export const validateToken = (token) => {
  return self.fetch(`https://api.github.com`, { headers: { Authorization: `token ${token}` } })
    .then(response => (+response.status < 400));
};
