/**
 * @file url listener for file SourceControl
 * @author netcon
 */

import { RouterState } from '@/router/types';
import { updateSourceControlChanges } from '@/source-control/changes';
import { updateCheckoutRefOnStatusBar } from '@/source-control/status-bar';
import { commitTreeDataProvider } from '@/views';

export const sourceControlRouterListener = (
	currentState: RouterState,
	previousState: RouterState
) => {
	if (currentState.ref !== previousState.ref) {
		updateCheckoutRefOnStatusBar();
		commitTreeDataProvider.updateTree();
	}

	if (currentState.pullNumber !== previousState.pullNumber) {
		updateSourceControlChanges();
	}

	if (currentState.commitSha !== previousState.commitSha) {
		updateSourceControlChanges();
	}
};
