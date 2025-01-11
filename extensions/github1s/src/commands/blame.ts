/**
 * @file GitHub1s Blame Related Commands
 * @author netcon
 */

import * as vscode from 'vscode';
import { relativeTimeTo } from '@/helpers/date';
import { last } from '@/helpers/util';
import { setVSCodeContext } from '@/helpers/vscode';
import router from '@/router';
import { Repository } from '@/repository';
import { BlameRange, PlatformName } from '@/adapters/types';
import { adapterManager } from '@/adapters';

const ageColors = [
	'#f66a0a',
	'#ef6939',
	'#e26862',
	'#d3677e',
	'#c46696',
	'#b365a9',
	'#a064bb',
	'#8a63cc',
	'#7162db',
	'#5061e9',
	'#0a60f6',
];

const openOnOfficialPageCommand = {
	[PlatformName.GitHub]: {
		command: 'github1s.commands.openCommitOnGitHub',
		title: 'Open on GitHub',
	},
	[PlatformName.GitLab]: {
		command: 'github1s.commands.openCommitOnGitLab',
		title: 'Open on GitLab',
	},
	[PlatformName.Bitbucket]: {
		command: 'github1s.commands.openCommitOnBitbucket',
		title: 'Open on Bitbucket',
	},
	[PlatformName.OfficialPage]: {
		command: 'github1s.commands.openCommitOnOfficialPage',
		title: 'Open on Official Page',
	},
};

const createCommitMessagePreviewMarkdown = (blameRange: BlameRange, platformName: PlatformName) => {
	const commit = blameRange.commit;
	const messageTextLines: string[] = [];

	messageTextLines.push(
		`![avatar](${commit.avatarUrl}|width=16px,height=16px) [${commit.author}](mailto:${commit.email}), ${relativeTimeTo(commit.createTime)} (*${commit.createTime}*)`, // prettier-ignore
	);
	messageTextLines.push(`Commit ID: ${commit.sha}`);

	messageTextLines.push('---');
	messageTextLines.push(`~~~\n${commit.message}\n~~~`);
	messageTextLines.push('---');

	const commandConfig = openOnOfficialPageCommand[platformName];
	const switchToCommitCommandText = `command:github1s.commands.switchToCommit?${encodeURIComponent(JSON.stringify([commit.sha]))}`; // prettier-ignore
	const openOnGitHubCommandText = `command:${commandConfig.command}?${encodeURIComponent(JSON.stringify([commit.sha]))}`; // prettier-ignore
	messageTextLines.push(
		`[$(log-in) Switch to Commit](${switchToCommitCommandText}) | [$(globe) ${commandConfig.title}](${openOnGitHubCommandText})`,
	);

	const markdownString = new vscode.MarkdownString(messageTextLines.join('\n\n'), true);
	markdownString.isTrusted = true;
	return markdownString;
};

const commonLineDecorationTypeOptions = {
	before: {
		width: '460px',
		height: '100%',
		contentText: '.',
		color: 'rgba(0, 0, 0, 0)',
		margin: '0 20px 0 0',
		borderStyle: 'none',
		textDecoration: `none;
			box-sizing: border-box;
			padding-right: 110px;
			border-right-width: 2px;
			border-right-style: solid`,
	},
	after: {
		width: '460px',
		height: '100%',
		contentText: '.',
		color: 'rgba(0, 0, 0, 0)',
		textDecoration: `none;
			box-sizing: border-box;
			position: absolute;
			left: 0;
			z-index: -1;
			text-align: right;
			padding-right: 6px`,
		backgroundColor: new vscode.ThemeColor('github1s.colors.gutterBlameBackground'),
	},
};

// the decoration type for the all lines that belong
// to the commit which user are focusing to
const createSelectedLineDecorationType = () =>
	vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		overviewRulerColor: new vscode.ThemeColor('github1s.colors.highlightGutterBlameBackground'),
		backgroundColor: new vscode.ThemeColor('github1s.colors.highlightGutterBlameBackground'),
	});

// the decoration type for the first line of **a blame block**
const createFirstLineDecorationType = (blameRange: BlameRange) => {
	// put the avatar of commit author to the beginning of the line
	const firstLineBeforeTextDecorationCss =
		commonLineDecorationTypeOptions.before.textDecoration +
		`; white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: bottom;
		text-indent: 2em;
		background-image: url(${encodeURI(blameRange.commit?.avatarUrl || '')});
		background-size: auto 95%;
		background-position: 0 50%;
		background-repeat: no-repeat`;
	// set the split line with other blame blocks
	const firstLineAfterTextDecorationCss =
		commonLineDecorationTypeOptions.after.textDecoration + `; box-shadow: 0 -1px 0 rgba(0, 0, 0, .3)`;

	return vscode.window.createTextEditorDecorationType({
		...commonLineDecorationTypeOptions,
		before: {
			...commonLineDecorationTypeOptions.before,
			contentText: blameRange.commit.message,
			color: new vscode.ThemeColor('foreground'),
			textDecoration: firstLineBeforeTextDecorationCss,
			borderColor: ageColors[blameRange.age % 11 || 10],
		},
		after: {
			...commonLineDecorationTypeOptions.after,
			contentText: relativeTimeTo(blameRange.commit.createTime),
			color: new vscode.ThemeColor('descriptionForeground'),
			textDecoration: firstLineAfterTextDecorationCss,
		},
	});
};

// the decoration type for the rest lines (not the first line) of a blame block
const createRestLinesDecorationType = (blameRange: BlameRange) => {
	return vscode.window.createTextEditorDecorationType({
		...commonLineDecorationTypeOptions,
		before: {
			...commonLineDecorationTypeOptions.before,
			borderColor: ageColors[blameRange.age % 11 || 10],
		},
	});
};

// create decoration option for each line of a blame block
const createLineDecorationOptions = (
	blameRange: BlameRange,
	hoverMessage?: vscode.MarkdownString | string,
): vscode.DecorationOptions[] => {
	const decorationOptions: vscode.DecorationOptions[] = [];
	const { startingLine, endingLine } = blameRange;

	for (let lineIndex = startingLine - 1; lineIndex < endingLine; lineIndex++) {
		decorationOptions.push({
			range: new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex, 0)),
			hoverMessage,
		});
	}
	return decorationOptions;
};

class EditorGitBlame {
	private static instanceMap = new WeakMap<vscode.TextEditor, EditorGitBlame>();
	private opening: boolean = false; // if the editor blame is showing now
	private refreshDisposables: vscode.Disposable[] = [];
	private selectionDisposables: vscode.Disposable[] = [];

	private constructor(private editor: vscode.TextEditor) {
		vscode.window.onDidChangeTextEditorSelection((event) => {
			if (this.opening && event.selections.length) {
				this.selection(last(event.selections).active.line);
			}
		});
	}

	public static getInstance(editor: vscode.TextEditor) {
		if (!EditorGitBlame.instanceMap.has(editor)) {
			EditorGitBlame.instanceMap.set(editor, new EditorGitBlame(editor));
		}
		return EditorGitBlame.instanceMap.get(editor)!;
	}

	async getBlameRanges(): Promise<BlameRange[]> {
		const filePath = this.editor.document?.uri.path;
		const fileAuthority = this.editor.document?.uri.authority || (await router.getAuthority());
		const [repo, ref] = fileAuthority.split('+').filter(Boolean);
		const scheme = adapterManager.getCurrentScheme();
		const repository = Repository.getInstance(scheme, repo);
		return filePath ? repository.getFileBlameRanges(ref, filePath.slice(1)) : [];
	}

	async open() {
		this.refreshDisposables.forEach((disposable) => disposable.dispose());
		setVSCodeContext('github1s:features:gutterBlame:open', true);
		const { platformName } = adapterManager.getCurrentAdapter();

		(await this.getBlameRanges()).forEach((blameRange) => {
			const hoverMessage = createCommitMessagePreviewMarkdown(blameRange, platformName);
			const firstLineDecorationType = createFirstLineDecorationType(blameRange);
			const lineDecorationOptions = createLineDecorationOptions(blameRange, hoverMessage);

			this.refreshDisposables.push(firstLineDecorationType);
			this.editor.setDecorations(firstLineDecorationType, [lineDecorationOptions[0]]);

			if (lineDecorationOptions.length > 1) {
				const restLinesDecorationType = createRestLinesDecorationType(blameRange);

				this.refreshDisposables.push(restLinesDecorationType);
				this.editor.setDecorations(restLinesDecorationType, lineDecorationOptions.slice(1));
			}
		});
		this.opening = true;
	}

	async selection(lineIndex: number) {
		this.selectionDisposables.forEach((disposable) => disposable.dispose());

		const blameRanges = await this.getBlameRanges();
		const selectedCommitSha = blameRanges.find(
			(blameRange) => blameRange.startingLine - 1 <= lineIndex && blameRange.endingLine - 1 >= lineIndex,
		)?.commit.sha;
		const selectedBlameRanges = blameRanges.filter((blameRange) => blameRange.commit.sha === selectedCommitSha);
		const decorationType = createSelectedLineDecorationType();
		const decorationOptions: vscode.DecorationOptions[] = [];

		this.selectionDisposables.push(decorationType);
		selectedBlameRanges.forEach((blameRange) => {
			decorationOptions.push(...createLineDecorationOptions(blameRange));
		});
		this.editor.setDecorations(decorationType, decorationOptions);
	}

	close() {
		setVSCodeContext('github1s:features:gutterBlame:open', false);
		this.refreshDisposables.forEach((disposable) => disposable.dispose());
		this.selectionDisposables.forEach((disposable) => disposable.dispose());
		this.opening = false;
	}

	toggle() {
		return this.opening ? this.close() : this.open();
	}
}

const commandToggleEditorGutterBlame = () => {
	if (vscode.window.activeTextEditor) {
		return EditorGitBlame.getInstance(vscode.window.activeTextEditor).toggle();
	}
};

const commandOpenEditorGutterBlame = () => {
	if (vscode.window.activeTextEditor) {
		return EditorGitBlame.getInstance(vscode.window.activeTextEditor).open();
	}
};

const commandCloseEditorGutterBlame = () => {
	if (vscode.window.activeTextEditor) {
		return EditorGitBlame.getInstance(vscode.window.activeTextEditor).close();
	}
};

export const registerBlameCommands = (context: vscode.ExtensionContext) => {
	return context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.toggleEditorGutterBlame', commandToggleEditorGutterBlame),
		vscode.commands.registerCommand('github1s.commands.openEditorGutterBlame', commandOpenEditorGutterBlame),
		vscode.commands.registerCommand('github1s.commands.closeEditorGutterBlame', commandCloseEditorGutterBlame),
	);
};
