/**
 * @file github1s commands
 * @author netcon
 */

import { getExtensionContext } from '@/helpers/context';
import { registerRefCommands } from './ref';
import { registerCodeReviewCommands } from './code-review';
import { registerCommitCommands } from './commit';
import { registerEditorCommands } from './editor';
import { registerBlameCommands } from './blame';
import { registerGlobalCommands } from './global';

export const registerGitHub1sCommands = () => {
	const context = getExtensionContext();

	registerRefCommands(context);
	registerEditorCommands(context);
	registerCodeReviewCommands(context);
	registerCommitCommands(context);
	registerBlameCommands(context);
	registerGlobalCommands(context);
};
