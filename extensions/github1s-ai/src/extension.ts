import * as vscode from 'vscode';

import { createStores } from '@/stores';

import { ChatViewProvider } from './chat-view';
import { Controllers } from './controllers';

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
	const stores = await createStores(context);
	const controllers = new Controllers(stores);
	const chatViewProvider = new ChatViewProvider(context.extensionUri, controllers);
	const viewRegistration = vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider, {
		webviewOptions: { retainContextWhenHidden: true },
	});

	context.subscriptions.push(controllers, chatViewProvider, viewRegistration);
};
