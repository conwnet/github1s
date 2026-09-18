/**
 * @file decorate footer
 * @author netcon
 */

import { updateCheckoutTo } from './checkout';
import { showThanks } from './thanks';

export const decorateStatusBar = () => {
	updateCheckoutTo();
	showThanks();
};
