import { isSyntaxHighlightingData, type SyntaxHighlightingData } from '@/common/highlighting';
import { MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH, type MarkdownHighlightRequest } from '@/common/protocol';

export type PostMarkdownHighlightRequest = (request: MarkdownHighlightRequest) => void;

interface CodeBlockRegistration {
	element: HTMLElement;
	languageId: string;
	source: string;
	post: PostMarkdownHighlightRequest;
	generation: number;
	timer?: number;
	requestId?: string;
}

interface PendingRequest {
	registration: CodeBlockRegistration;
	generation: number;
	themeRevision: number;
}

const HIGHLIGHT_DELAY_MS = 150;

const registrations = new Set<CodeBlockRegistration>();
const pendingRequests = new Map<string, PendingRequest>();
let requestSequence = 0;
let themeRevision = 0;
let renderedColorMap = '';

window.addEventListener('message', (event: MessageEvent<unknown>) => {
	const message = event.data;
	if (!isRecord(message) || typeof message.type !== 'string') return;
	if (message.type === 'markdown.highlightingChanged') {
		themeRevision += 1;
		pendingRequests.clear();
		clearColorMap();
		for (const registration of registrations) {
			registration.element.textContent = registration.source;
			scheduleHighlight(registration, 0);
		}
		return;
	}
	if (message.type !== 'markdown.highlightResult' || typeof message.requestId !== 'string') return;
	const pending = pendingRequests.get(message.requestId);
	if (!pending) return;
	pendingRequests.delete(message.requestId);
	const { registration } = pending;
	if (
		!registrations.has(registration) ||
		!registration.element.isConnected ||
		pending.generation !== registration.generation ||
		pending.themeRevision !== themeRevision ||
		!isSyntaxHighlightingData(message.highlighting, registration.source.length)
	) {
		return;
	}
	updateColorMap(message.highlighting.colorMap);
	renderTokens(registration.element, registration.source, message.highlighting.tokens);
});

export const highlightCodeBlocks = (root: HTMLElement, post: PostMarkdownHighlightRequest): (() => void) => {
	const ownedRegistrations: CodeBlockRegistration[] = Array.from(
		root.querySelectorAll<HTMLElement>('code[data-code-language]'),
		(element) => ({
			element,
			languageId: element.dataset.codeLanguage || 'plaintext',
			source: element.textContent ?? '',
			post,
			generation: 0,
		}),
	);
	for (const registration of ownedRegistrations) {
		registrations.add(registration);
		scheduleHighlight(registration);
	}

	return () => {
		for (const registration of ownedRegistrations) {
			registrations.delete(registration);
			if (registration.timer !== undefined) window.clearTimeout(registration.timer);
			if (registration.requestId) pendingRequests.delete(registration.requestId);
		}
	};
};

const scheduleHighlight = (registration: CodeBlockRegistration, delay = HIGHLIGHT_DELAY_MS): void => {
	if (registration.timer !== undefined) window.clearTimeout(registration.timer);
	if (registration.requestId) pendingRequests.delete(registration.requestId);
	registration.generation += 1;
	const generation = registration.generation;
	registration.timer = window.setTimeout(() => {
		registration.timer = undefined;
		if (
			!registrations.has(registration) ||
			!registration.element.isConnected ||
			registration.source.length > MAX_SYNTAX_HIGHLIGHT_SOURCE_LENGTH
		) {
			return;
		}
		const requestId = `syntax-${++requestSequence}`;
		registration.requestId = requestId;
		pendingRequests.set(requestId, { registration, generation, themeRevision });
		registration.post({
			type: 'markdown.highlight',
			requestId,
			languageId: registration.languageId,
			source: registration.source,
		});
	}, delay);
};

const renderTokens = (element: HTMLElement, source: string, tokens: SyntaxHighlightingData['tokens']): void => {
	const fragment = document.createDocumentFragment();
	let offset = 0;
	for (const token of tokens) {
		const value = source.slice(offset, offset + token.length);
		offset += token.length;
		const classes = tokenClasses(token.foreground, token.fontStyle);
		if (classes.length === 0) {
			fragment.append(document.createTextNode(value));
			continue;
		}
		const span = document.createElement('span');
		span.className = classes.join(' ');
		span.textContent = value;
		fragment.append(span);
	}
	element.replaceChildren(fragment);
};

const tokenClasses = (foreground: number, fontStyle: number): string[] => {
	const classes = foreground > 0 ? [`syntax-fg-${foreground}`] : [];
	if ((fontStyle & 1) !== 0) classes.push('syntax-italic');
	if ((fontStyle & 2) !== 0) classes.push('syntax-bold');
	const underline = (fontStyle & 4) !== 0;
	const strikethrough = (fontStyle & 8) !== 0;
	if (underline && strikethrough) classes.push('syntax-underline-strikethrough');
	else if (underline) classes.push('syntax-underline');
	else if (strikethrough) classes.push('syntax-strikethrough');
	return classes;
};

const updateColorMap = (colorMap: readonly string[]): void => {
	const serialized = colorMap.join(',');
	if (serialized === renderedColorMap) return;
	renderedColorMap = serialized;
	const style = document.getElementById('syntax-highlighting-theme');
	if (!(style instanceof HTMLStyleElement)) return;
	style.textContent = colorMap
		.map((color, index) => (index > 0 && isCssHexColor(color) ? `.syntax-fg-${index}{color:${color}}` : ''))
		.join('');
};

const clearColorMap = (): void => {
	renderedColorMap = '';
	const style = document.getElementById('syntax-highlighting-theme');
	if (style instanceof HTMLStyleElement) style.textContent = '';
};

const isCssHexColor = (value: string): boolean => /^#[\da-f]{6}(?:[\da-f]{2})?$/iu.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
