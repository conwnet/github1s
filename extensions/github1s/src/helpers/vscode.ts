/**
 * @file helper functions about vscode
 * @author netcon
 */

import * as vscode from 'vscode';

export const setVSCodeContext = (key, value) => vscode.commands.executeCommand('setContext', key, value);
