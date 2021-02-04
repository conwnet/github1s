/**
 * @file GitHub1s APIs
 * @author netcon
 */

import * as vscode from 'vscode';
import { fetch, RequestError, RequestRateLimitError, RequestInvalidTokenError, RequestNotFoundError } from './util/fetch';

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

const handleRequestError = (error: RequestError) => {
  if (error instanceof RequestRateLimitError) {
    if (!error.token) {
      throw vscode.FileSystemError.NoPermissions('API Rate Limit Exceeded, Please Offer an OAuth Token.');
    }
    throw vscode.FileSystemError.NoPermissions('API Rate Limit Exceeded, Please Change Another OAuth Token.');
  }
  if (error instanceof RequestInvalidTokenError) {
    throw vscode.FileSystemError.NoPermissions('Current OAuth Token Is Invalid, Please Change Another One.');
  }
  if (error instanceof RequestNotFoundError) {
    throw vscode.FileSystemError.NoPermissions('Current OAuth Token Is Invalid, Please Change Another One.');
  }
  if (error instanceof RequestNotFoundError) {
    throw vscode.FileSystemError.FileNotFound('GitHub Resource Not Found');
  }
  throw vscode.FileSystemError.Unavailable(error.message || 'Unknown Error Occurred When Request To GitHub');
};

export const readGitHubDirectory = (uri: vscode.Uri) => {
  const state: UriState = parseUri(uri);
  return fetch(`https://api.github.com/repos/${state.owner}/${state.repo}/git/trees/${state.branch}${state.path.replace(/^\//, ':')}`)
    .catch(handleRequestError)
};

export const readGitHubFile = (uri: vscode.Uri, fileSha: string) => {
  const state: UriState = parseUri(uri);
  return fetch(`https://api.github.com/repos/${state.owner}/${state.repo}/git/blobs/${fileSha}`)
    .catch(handleRequestError);
};

export const validateToken = (token) => {
  return self.fetch(`https://api.github.com`, { headers: { Authorization: `token ${token}` } })
    .then(response => (+response.status < 400));
};
