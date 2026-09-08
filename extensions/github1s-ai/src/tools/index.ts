import { createGlobTool } from './glob';
import { createLsTool } from './ls';
import { createReadTool } from './read';
import { createSearchTool } from './search';

export const createBasicTools = () => ({
	read: createReadTool(),
	ls: createLsTool(),
	glob: createGlobTool(),
	search: createSearchTool(),
});
