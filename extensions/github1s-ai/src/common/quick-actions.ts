export const QUICK_ACTIONS = [
	{
		action: 'repositoryOverview' as const,
		icon: 'repo',
		title: 'Repository overview',
		description: 'Explore the structure, README, and key manifests.',
		prompt: 'Give me an overview of this repository.',
		attachment: undefined,
	},
	{
		action: 'explainCurrentFile' as const,
		icon: 'file',
		title: 'Explain current file',
		description: 'Understand its purpose, structure, and key components.',
		prompt: 'Explain the current file.',
		attachment: 'currentFile',
	},
	{
		action: 'explainSelection' as const,
		icon: 'selection',
		title: 'Explain selection',
		description: 'Understand what the selected code does.',
		prompt: 'Explain the selected code.',
		attachment: 'currentSelection',
	},
] as const;

export type ChatQuickAction = (typeof QUICK_ACTIONS)[number]['action'];

export const isQuickAction = (value: unknown): value is ChatQuickAction =>
	QUICK_ACTIONS.some(({ action }) => action === value);

export const getQuickAction = (action: ChatQuickAction): (typeof QUICK_ACTIONS)[number] =>
	QUICK_ACTIONS.find((candidate) => candidate.action === action)!;
