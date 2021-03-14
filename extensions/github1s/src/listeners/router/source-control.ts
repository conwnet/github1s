/**
 * @file url listener for file SourceControl
 * @author netcon
 */

import { RouterState } from '@/router/types';
import { updateSourceControlChanges } from '@/source-control/changes';
import { updateCheckoutRefOnStatusBar } from '@/source-control/status-bar';

export const sourceControlRouterListener = (
	currentState: RouterState,
	previousState: RouterState
) => {
	if (currentState.ref !== previousState.ref) {
		updateCheckoutRefOnStatusBar();
	}

	if (currentState.pullNumber !== previousState.pullNumber) {
		updateSourceControlChanges();
	}
};
