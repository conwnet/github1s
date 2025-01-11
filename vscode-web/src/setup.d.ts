/* eslint-disable no-var */
declare var _VSCODE_WEB: {
	workspace?: { folderUri?: any; workspaceUri?: any };
	workspaceId?: string; // the identifier to distinguish workspace
	workspaceLabel?: string; // the label shown on explorer
	hideTextFileLabelDecorations?: boolean; // whether hide the readonly icon for readonly files
	allowEditorLabelOverride?: boolean; // whether allow override editor label
	// custom builtin extensions, types see IBundledExtension[]
	builtinExtensions?: any[] | ((builtinExtensions: any[]) => any[]);
	logo?: {
		// custom editor logo, hide logo if this is undefined
		icon?: string; // logo icon image url
		title?: string; // logo title
		onClick?: () => void; // logo click callback
	};
	onWorkbenchReady?: (scheme: string) => void; // workbench ready callback
};
