/**
 * @file trending page data source
 * @author netcon
 */

import { DataSource } from '../../types';

export class GitHub1sTrendingDataSource extends DataSource {
	private static instance: GitHub1sTrendingDataSource | null = null;

	public static getInstance(): GitHub1sTrendingDataSource {
		if (GitHub1sTrendingDataSource.instance) {
			return GitHub1sTrendingDataSource.instance;
		}
		return (GitHub1sTrendingDataSource.instance = new GitHub1sTrendingDataSource());
	}
}
