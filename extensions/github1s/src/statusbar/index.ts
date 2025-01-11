/**
 * @file decorate footer
 * @author netcon
 */

import { updateCheckoutTo } from './checkout';
import { showSponsors } from './sponsors';

export const decorateStatusBar = () => {
	updateCheckoutTo();
	showSponsors();
};
