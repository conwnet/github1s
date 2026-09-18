/**
 * @file Router listener for the source control history
 */

import type { RouterState } from '@/adapters/types';
import { GitHub1sHistoryProvider } from '@/changes/history';

export const historyRouterListener = (currentState: RouterState, previousState: RouterState) => {
	if (currentState.repo !== previousState.repo || currentState.ref !== previousState.ref) {
		GitHub1sHistoryProvider.getInstance().refresh();
	}
};
