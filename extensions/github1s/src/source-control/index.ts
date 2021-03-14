/**
 * @file Source Control
 * @author netcon
 */

import { updateSourceControlChanges } from './changes';
import { updateCheckoutRefOnStatusBar } from './status-bar';

export const activateSourceControl = async () => {
	updateCheckoutRefOnStatusBar();
	updateSourceControlChanges();
};
