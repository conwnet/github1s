/**
 * @file Router listener for the file history timeline
 */

import type { RouterState } from '@/adapters/types';
import { FileHistoryTimelineProvider } from '@/providers/timeline';

export const timelineRouterListener = (currentState: RouterState, previousState: RouterState) => {
	if (currentState.repo !== previousState.repo || currentState.ref !== previousState.ref) {
		FileHistoryTimelineProvider.getInstance().refresh();
	}
};
