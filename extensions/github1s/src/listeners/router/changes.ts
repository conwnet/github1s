/**
 * @file url listener for file SourceControl
 * @author netcon
 */

import { RouterState } from '@/adapters/types';
import { updateCheckoutTo } from '@/statusbar/checkout';
import { updateSourceControlChanges } from '@/changes';
import { commitTreeDataProvider } from '@/views';

type NewType = RouterState;

export const sourceControlRouterListener = (currentState: NewType, previousState: RouterState) => {
	if (currentState.ref !== previousState.ref) {
		updateCheckoutTo();
		commitTreeDataProvider.updateTree();
	}

	if ((currentState as any).codeReviewId !== (previousState as any).codeReviewId) {
		updateSourceControlChanges();
	}

	if ((currentState as any).commitSha !== (previousState as any).commitSha) {
		updateSourceControlChanges();
	}
};
