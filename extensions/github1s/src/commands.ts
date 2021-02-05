/**
 * @file github1s commands
 * @author netcon
 */

import * as vscode from 'vscode';
import { getExtensionContext } from './util';
import { validateToken } from './api';

export const commandValidateToken = (silent: boolean = false) => {
  const context = getExtensionContext();
  const oAuthToken = context.globalState.get('github-oauth-token') as string || '';
  return validateToken(oAuthToken).then(tokenStatus => {
    if (!silent) {
      const remaining = tokenStatus.remaining;
      if (!oAuthToken) {
        if (remaining > 0) {
          vscode.window.showWarningMessage(`You haven\'t set a GitHub OAuth Token yet, and you can have ${remaining} requests in the current rate limit window.`);
        } else {
          vscode.window.showWarningMessage('You haven\'t set a GitHub OAuth Token yet, and the rate limit is exceeded.');
        }
      } if (!tokenStatus.valid) {
        vscode.window.showErrorMessage('Current GitHub OAuth Token is invalid.');
      } else if (tokenStatus.valid && tokenStatus.remaining > 0) {
        vscode.window.showInformationMessage(`Current GitHub OAuth Token is OK, and you can have ${remaining} requests in the current rate limit window.`);
      } else if (tokenStatus && tokenStatus.remaining <= 0) {
        vscode.window.showWarningMessage('Current GitHub OAuth Token is Valid, but the rate limit is exceeded.');
      }
    }
    return tokenStatus;
  });
};

export const commandUpdateToken = (silent: boolean = false) => {
  return vscode.window.showInputBox({
    placeHolder: 'Please input the GitHub OAuth Token',
  }).then(token => {
    if (!token) return;
    getExtensionContext()!.globalState.update('github-oauth-token', token || '');
    !silent && vscode.window.showInformationMessage('GitHub OAuth Token have saved, please reload the page');
  });
};

export const commandClearToken = (silent: boolean = false) => {
  !silent && vscode.window.showInformationMessage('You have cleared the GitHb OAuth Token');
  return getExtensionContext()!.globalState.update('github-oauth-token', '');
};
