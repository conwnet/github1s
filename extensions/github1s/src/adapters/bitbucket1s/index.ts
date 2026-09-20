/**
 * @file Bitbucket adapter
 * @author netcon
 */

import { BitbucketRouterParser } from './router-parser';
import { SourcegraphDataSource } from '../sourcegraph/data-source';
import { Adapter, CodeReviewType, PlatformName } from '../types';

export class BitbucketAdapter implements Adapter {
	public scheme: string = 'bitbucket1s';
	public platformName = PlatformName.Bitbucket;
	public codeReviewType = CodeReviewType.PullRequest;

	resolveDataSource() {
		return Promise.resolve(SourcegraphDataSource.getInstance('bitbucket'));
	}

	resolveRouterParser() {
		return Promise.resolve(BitbucketRouterParser.getInstance());
	}
}
