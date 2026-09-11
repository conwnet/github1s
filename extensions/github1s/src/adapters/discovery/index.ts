import { Adapter, PlatformName } from '../types';
import { DiscoveryDataSource } from './data-source';
import { DiscoveryRouterParser } from './router-parser';

export class DiscoveryAdapter implements Adapter {
	public readonly scheme = 'discovery';
	public readonly platformName = PlatformName.GitHub;
	private readonly dataSource = new DiscoveryDataSource();
	private readonly routerParser = new DiscoveryRouterParser();

	resolveDataSource() {
		return this.dataSource;
	}

	resolveRouterParser() {
		return this.routerParser;
	}
}
