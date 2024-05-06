/**
 * @file Sourceforge1s adapter
 * @author Your Name
 */

import { Sourceforge1sDataSource } from './data-source';
import { Sourceforge1sRouterParser } from './router-parser';
import { Adapter, CodeReviewType, PlatformName } from '../types';
import { setVSCodeContext } from '@/helpers/vscode';

export class Sourceforge1sAdapter implements Adapter {
	public scheme: string = 'sourceforge1s';
	public platformName = PlatformName.OfficialPage; // Adjust as needed
	public codeReviewType = CodeReviewType.CodeReview; // Adjust as needed

	resolveDataSource() {
		return Promise.resolve(Sourceforge1sDataSource.getInstance());
	}

	resolveRouterParser() {
		return Promise.resolve(Sourceforge1sRouterParser.getInstance());
	}

	activateAsDefault() {
		// Implement activation logic here
		setVSCodeContext('github1s:views:settings:visible', true);
	}

	deactivateAsDefault() {
		// Implement deactivation logic here
		setVSCodeContext('github1s:views:settings:visible', false);
	}
}
