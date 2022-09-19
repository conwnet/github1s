/**
 * @file OSSInsight adapter
 * @author netcon
 */

import { OSSInsightDataSource } from './data-source';
import { OSSInsightRouterParser } from './router-parser';
import { Adapter, PlatformName } from '../types';

export class OSSInsightAdapter implements Adapter {
	public scheme: string = 'ossinsight';
	public platformName = PlatformName.GitHub;

	async resolveDataSource() {
		return OSSInsightDataSource.getInstance();
	}

	async resolveRouterParser() {
		return OSSInsightRouterParser.getInstance();
	}

	activateAsDefault() {}

	deactivateAsDefault() {}
}
