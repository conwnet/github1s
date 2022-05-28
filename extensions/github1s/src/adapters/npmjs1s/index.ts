/**
 * @file Npmjs1s adapter
 * @author netcon
 */

import { Npmjs1sDataSource } from './data-source';
import { Npmjs1sRouterParser } from './router-parser';
import { Adapter, PlatformName } from '../types';

export class Npmjs1sAdapter implements Adapter {
	public scheme: string = 'npmjs1s';
	public platformName = PlatformName.npm;

	resolveDataSource() {
		return Npmjs1sDataSource.getInstance();
	}

	resolveRouterParser() {
		return Npmjs1sRouterParser.getInstance();
	}
}
