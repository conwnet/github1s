/**
 * @file github1s fetch api
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from './context';

const getGitHubAuthToken = (): string => {
  const context = getExtensionContext();
  return context?.workspaceState.get('github-oauth-token') || '';
};

const quickSetGitHubOAuthToken = (() => {
  let hasInputBox = false;
  return (options?: object) => {
    if (hasInputBox) return;
    hasInputBox = true;
    vscode.window.showInputBox({
      placeHolder: 'Please Input GitHub OAuth Token',
      prompt: 'GitHub API rate limit exceeded',
      ...options,
    }).then(token => {
      hasInputBox = false;
      if (!token) return;
      getExtensionContext()!.workspaceState.update('github-oauth-token', token || '');
      vscode.window.showInformationMessage('GitHub OAuth Token have saved, please reload the page');
    });
  };
})();

export const fetch = (url: string, options?: RequestInit) => {
  const token = getGitHubAuthToken();
  const authHeaders = token ? { Authorization: `token ${token}` } : {};
  const customHeaders = (options && 'headers' in options ? options.headers : {})

  return self.fetch(url, { ...options, headers: { ...authHeaders, ...customHeaders } })
    .then(response => {
      if (+response.status < 400) {
        return response.json()
      }
      if (+response.status >= 400 && +response.status < 500) {
        return response.json().then(data => {
          if (+response.status === 403 && (data.message || '').includes('rate limit exceeded')) {
            quickSetGitHubOAuthToken();
          }
          if (+response.status === 401 && (data.message || '').includes('Bad credentials')) {
            quickSetGitHubOAuthToken({ prompt: 'Invalid GitHub OAuth Token' });
            throw new Error(data.message + ' (Maybe the GitHub OAuth Token you saved is invalid)');
          }
          throw new Error(data.message);
        });
      }
      throw new Error(`GitHub1s: Request got HTTP ${response.status} response`);
    })
    .catch(e => {
      if ((e.message.includes('rate limit exceeded'))) {
        vscode.window.showErrorMessage(e.message, 'I Have Github OAuth Token')
          .then((button) => { (button === 'I Have Github OAuth Token') && quickSetGitHubOAuthToken(); });
      } else if (e.message.includes('Bad credentials')) {
        vscode.window.showErrorMessage(e.message, 'Change Another Token')
          .then((button) => { (button === 'Change Another Token') && quickSetGitHubOAuthToken({ prompt: '' }); });
      } else vscode.window.showErrorMessage(e.message || 'GitHub1s: Unknown Error')
      throw e;
    });
};
