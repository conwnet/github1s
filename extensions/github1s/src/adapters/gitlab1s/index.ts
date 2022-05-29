/**
 * @file GitLab1s adapter
 * @author netcon
 */

import { GitLab1sRouterParser } from './router-parser';
import { SourcegraphDataSource } from '../sourcegraph/data-source';
import { Adapter, CodeReviewType, PlatformName } from '../types';
import { setVSCodeContext } from '@/helpers/vscode';

export class GitLab1sAdapter implements Adapter {
	public scheme: string = 'gitlab1s';
	public platformName = PlatformName.GitLab;
	public codeReviewType = CodeReviewType.MergeRequest;

	resolveDataSource() {
		return Promise.resolve(SourcegraphDataSource.getInstance('gitlab'));
	}

	resolveRouterParser() {
		return Promise.resolve(GitLab1sRouterParser.getInstance());
	}

	activateAsDefault() {
		setVSCodeContext('github1s:views:commitList:visible', true);
		setVSCodeContext('github1s:views:fileHistory:visible', true);
		setVSCodeContext('github1s:features:gutterBlame:enabled', true);
	}

	deactivateAsDefault() {
		setVSCodeContext('github1s:views:commitList:visible', false);
		setVSCodeContext('github1s:views:fileHistory:visible', false);
		setVSCodeContext('github1s:features:gutterBlame:enabled', false);
	}
}
