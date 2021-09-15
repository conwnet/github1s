/**
 * @file GitHub1s adapter
 * @author netcon
 */

import { DataSourceProvider, PlatformAdapter, Promisable, RouterParser } from '../types';
import { GitHub1sDataSourceProvider } from './data-source-provider';
import { GitHub1sRouterParser } from './router-parser';

export class GitHub1sPlatformAdapter implements PlatformAdapter {
	public scheme: string = 'github1s';
	public name: string = 'GitHub';

	resolveDataSourceProvider(): Promisable<DataSourceProvider> {
		return Promise.resolve(new GitHub1sDataSourceProvider());
	}

	resolveRouterParser(): Promisable<RouterParser> {
		return Promise.resolve(new GitHub1sRouterParser());
	}
}
