/**
 * @file GitHub1s adapter
 * @author netcon
 */

import { DataSource, RouterParser, PlatformAdapter, Promisable } from '../types';
import { GitHub1sDataSource } from './data-source';
import { GitHub1sRouterParser } from './router-parser';

export class GitHub1sPlatformAdapter implements PlatformAdapter {
	public scheme: string = 'github1s';
	public name: string = 'GitHub';

	resolveDataSource(): Promisable<DataSource> {
		return Promise.resolve(GitHub1sDataSource.getInstance());
	}

	resolveRouterParser(): Promisable<RouterParser> {
		return Promise.resolve(GitHub1sRouterParser.getInstance());
	}
}
