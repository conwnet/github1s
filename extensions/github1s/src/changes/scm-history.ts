import {
	CancellationToken,
	Event,
	ProviderResult,
	SourceControlHistoryItem,
	SourceControlHistoryItemChange,
	SourceControlHistoryItemRef,
	SourceControlHistoryItemRefsChangeEvent,
	SourceControlHistoryOptions,
	SourceControlHistoryProvider,
} from 'vscode';

export class GitHub1sSCMHistoryProvider implements SourceControlHistoryProvider {
	currentHistoryItemRef: SourceControlHistoryItemRef | undefined;
	currentHistoryItemRemoteRef: SourceControlHistoryItemRef | undefined;
	currentHistoryItemBaseRef: SourceControlHistoryItemRef | undefined;
	onDidChangeCurrentHistoryItemRefs: Event<void>;
	onDidChangeHistoryItemRefs: Event<SourceControlHistoryItemRefsChangeEvent>;
	provideHistoryItemRefs(
		historyItemRefs: string[] | undefined,
		token: CancellationToken
	): ProviderResult<SourceControlHistoryItemRef[]> {
		throw new Error('Method not implemented.');
	}
	provideHistoryItems(
		options: SourceControlHistoryOptions,
		token: CancellationToken
	): ProviderResult<SourceControlHistoryItem[]> {
		throw new Error('Method not implemented.');
	}
	provideHistoryItemChanges(
		historyItemId: string,
		historyItemParentId: string | undefined,
		token: CancellationToken
	): ProviderResult<SourceControlHistoryItemChange[]> {
		throw new Error('Method not implemented.');
	}
	resolveHistoryItemRefsCommonAncestor(historyItemRefs: string[], token: CancellationToken): ProviderResult<string> {
		throw new Error('Method not implemented.');
	}
}
