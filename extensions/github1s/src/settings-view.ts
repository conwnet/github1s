/**
 * @file GitHub1s Settings Webview Provider
 * @author netcon
 */

import * as vscode from 'vscode';
import { getNonce, getExtensionContext } from './util';
import { validateToken } from './api';

interface WebviewState {
  token?: string;
  pageType?: 'EDIT' | 'PREVIEW';
  valid?: boolean;
  validating?: boolean;
};

export class SettingsView implements vscode.WebviewViewProvider {
  public static readonly viewType = 'github1s-settings';
  private readonly _extensionContext: vscode.ExtensionContext;
  private _webviewView: vscode.WebviewView;

  constructor() {
    this._extensionContext = getExtensionContext();
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionContext.extensionUri],
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(data => {
      switch(data.type) {
        case 'validate-token':
          this.handleValidateToken(data.payload);
          break;
        case 'update-token':
          this.handleUpdateToken(data.payload);
          break;
        case 'clear-token':
          this._extensionContext.workspaceState.update('github-oauth-token', '');
          this.updateWebviewState({token: '', pageType: 'EDIT', valid: false, validating: false });
          break;
        default:
          const oauthToken = this._extensionContext.workspaceState.get('github-oauth-token') as string|| '';
          (oauthToken ? validateToken(oauthToken) : Promise.resolve(false)).then(isValid => {
            this.updateWebviewState({token: oauthToken, pageType: oauthToken ? 'PREVIEW' : 'EDIT', valid: isValid, validating: false });
          });
      }
    });
  }

  updateWebviewState(state: WebviewState) {
    this._webviewView.webview.postMessage({ type: 'update-state', payload: state });
  }

  handleValidateToken(token: string) {
    this.updateWebviewState({ validating: true });
    (token ? validateToken(token) : Promise.resolve(false)).then(isValid => {
      if (!isValid) vscode.window.showErrorMessage('This GitHub OAuth Token is INVALID!');
      else vscode.window.showInformationMessage('This GitHub OAuth Token is VALID!');
      this.updateWebviewState({ valid: isValid, validating: false });
      
    }).catch(() => this.updateWebviewState({ valid: false, validating: false }));
  }

  handleUpdateToken(token: string) {
    this.updateWebviewState({ validating: true });
    validateToken(token || '').then(isValid => {
      if (!isValid) {
        vscode.window.showErrorMessage('This GitHub OAuth Token is INVALID!');
        this.updateWebviewState({ token, valid: false, pageType: 'EDIT', validating: false });
        return;
      }
      this._extensionContext.workspaceState.update('github-oauth-token', token || '');
      this.updateWebviewState({ token, valid: true, pageType: 'PREVIEW', validating: false });
    }).catch(() => this.updateWebviewState({ token, valid: false, validating: false }));
  }

  _getHtmlForWebview(webview): string {
    const nonce = getNonce();
    const extensionUri = this._extensionContext.extensionUri;
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'styles.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'main.js'));

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${stylesUri}" rel="stylesheet">
        <title>GitHub1s Settings</title>
      </head>
      <body>
        <div class="loading-page">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="container edit-page">
          <div class="page-title">Set OAuth Token</div>
          <div class="description">
            <div>For unauthenticated requests, the rate limit of GitHub allows for up to 60 requests per hour.</div>
            <div>For API requests using Authentication, you can make up to 5,000 requests per hour.</div>
          </div>
          <div class="token-link">
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=GitHub1s" target="_blank">
              Generate New OAuth Token
            </a>
          </div>
          <div><input id="token-input" name="token" autocomplete="off" /></div>
          <div><button id="save-button">Save</button></div>
          <div><button id="preview-button">Cancel</button></div>
        </div>
        <div class="container preview-page">
          <div class="page-title">You have authenticated</div>
          <div class="description">
            <div class="token-status">
              Current OAuth Token is <span class="token-status-text"> ...</span>.
            </div>
            <div id="token-text"></div>
          </div>
          <div><button id="validate-button">Validate</button></div>
          <div><button id="edit-button">Edit</button></div>
          <div><button id="clear-button">Clear</button></div>
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
}
